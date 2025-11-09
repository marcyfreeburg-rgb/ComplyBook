// Referenced from javascript_log_in_with_replit blueprint
import type { Express } from "express";
import { createServer, type Server } from "http";
import crypto from "crypto";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { plaidClient } from "./plaid";
import { suggestCategory, suggestCategoryBulk } from "./aiCategorization";
import { ObjectStorageService } from "./objectStorage";
import { runVulnerabilityScan, getLatestVulnerabilitySummary } from "./vulnerabilityScanner";
import { sendInvoiceEmail } from "./email";
import memoize from "memoizee";
import multer from "multer";
import Papa from "papaparse";
import {
  insertOrganizationSchema,
  insertCategorySchema,
  insertVendorSchema,
  insertClientSchema,
  insertInvoiceSchema,
  insertInvoiceLineItemSchema,
  insertBillSchema,
  insertBillLineItemSchema,
  insertTransactionSchema,
  insertGrantSchema,
  insertBudgetSchema,
  insertBudgetItemSchema,
  insertInvitationSchema,
  insertExpenseApprovalSchema,
  insertCashFlowScenarioSchema,
  insertCashFlowProjectionSchema,
  insertTaxCategorySchema,
  insertTaxReportSchema,
  insertTaxForm1099Schema,
  insertCustomReportSchema,
  insertEmployeeSchema,
  insertDeductionSchema,
  insertPayrollRunSchema,
  insertPayrollItemSchema,
  // Nonprofit-specific schemas
  insertFundSchema,
  insertProgramSchema,
  insertPledgeSchema,
  insertPledgePaymentSchema,
  // Government Contracts (For-profit) schemas
  insertContractSchema,
  insertContractMilestoneSchema,
  insertProjectSchema,
  insertProjectCostSchema,
  insertTimeEntrySchema,
  insertIndirectCostRateSchema,
  // Enhanced Government Contract Cost Accounting schemas
  insertLaborBurdenRateSchema,
  insertBillingRateSchema,
  insertProjectBudgetBreakdownSchema,
  insertProjectRevenueLedgerSchema,
  insertProjectFinancialSnapshotSchema,
  // Government Grants (Nonprofit) schemas
  insertTimeEffortReportSchema,
  insertCostAllowabilityCheckSchema,
  insertSubAwardSchema,
  insertFederalFinancialReportSchema,
  insertAuditPrepItemSchema,
  type InsertOrganization,
  type InsertCategory,
  type InsertVendor,
  type InsertClient,
  type InsertTransaction,
  type InsertGrant,
  type InsertBudget,
  type InsertBudgetItem,
  type InsertInvitation,
  type InsertExpenseApproval,
  type InsertCashFlowScenario,
  type InsertTaxCategory,
  type InsertTaxReport,
  type InsertTaxForm1099,
  type InsertCustomReport,
} from "@shared/schema";

// Simple in-memory rate limiter for AI endpoints
const aiRequestLimiter = new Map<string, { count: number; resetAt: number }>();
const AI_RATE_LIMIT = 10; // requests per minute
const AI_RATE_WINDOW = 60 * 1000; // 1 minute in milliseconds

function checkAiRateLimit(userId: string, organizationId: number): boolean {
  const key = `${userId}:${organizationId}`;
  const now = Date.now();
  const userLimit = aiRequestLimiter.get(key);

  if (!userLimit || now > userLimit.resetAt) {
    aiRequestLimiter.set(key, { count: 1, resetAt: now + AI_RATE_WINDOW });
    return true;
  }

  if (userLimit.count >= AI_RATE_LIMIT) {
    return false;
  }

  userLimit.count++;
  return true;
}

// Permission checking helper
function hasPermission(
  role: string,
  permissions: string | null,
  requiredAction: 'view' | 'edit_transactions' | 'make_reports'
): boolean {
  // Owners and admins have all permissions
  if (role === 'owner' || role === 'admin') {
    return true;
  }

  // If no specific permissions set, deny by default
  if (!permissions) {
    return requiredAction === 'view';
  }

  // Check permission level against required action
  switch (requiredAction) {
    case 'view':
      // All permission levels can view
      return true;
    
    case 'edit_transactions':
      // Only edit_transactions or full_access can edit transactions
      return permissions === 'edit_transactions' || permissions === 'full_access';
    
    case 'make_reports':
      // Can make reports with make_reports, view_make_reports, or full_access
      return permissions === 'make_reports' || 
             permissions === 'view_make_reports' || 
             permissions === 'full_access';
    
    default:
      return false;
  }
}

// NIST 800-53 AU-2: Security Event Logging for Authorization Failures
async function logUnauthorizedAccess(req: any, reason: string, additionalData?: any) {
  try {
    const user = req.user?.claims;
    await storage.logSecurityEvent({
      eventType: reason === 'no_organization_access' ? 'unauthorized_access' : 'permission_denied',
      severity: 'warning',
      userId: user?.sub || null,
      email: user?.email || null,
      ipAddress: req.ip || req.socket.remoteAddress || null,
      userAgent: req.get('user-agent') || null,
      eventData: {
        reason,
        path: req.path,
        method: req.method,
        ...additionalData,
      },
    });
  } catch (error) {
    // Don't let logging failures break the application
    console.error('Failed to log unauthorized access:', error);
  }
}

// Helper function to calculate the next occurrence of a recurring transaction
function getNextOccurrence(recurring: any, referenceDate: Date): Date | null {
  const lastGenerated = recurring.lastGeneratedDate ? new Date(recurring.lastGeneratedDate) : null;
  const startDate = new Date(recurring.startDate);
  
  // If we haven't generated anything yet, check if startDate is due
  if (!lastGenerated) {
    if (startDate <= referenceDate) {
      return startDate;
    }
    return null;
  }
  
  // Calculate the next occurrence after last generated
  const nextDate = new Date(lastGenerated);
  
  switch (recurring.frequency) {
    case 'daily':
      nextDate.setDate(nextDate.getDate() + 1);
      break;
    case 'weekly':
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case 'biweekly':
      nextDate.setDate(nextDate.getDate() + 14);
      break;
    case 'monthly':
      // If dayOfMonth is specified, use it; otherwise use the day of startDate
      if (recurring.dayOfMonth) {
        nextDate.setMonth(nextDate.getMonth() + 1);
        nextDate.setDate(Math.min(recurring.dayOfMonth, new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate()));
      } else {
        nextDate.setMonth(nextDate.getMonth() + 1);
      }
      break;
    case 'quarterly':
      nextDate.setMonth(nextDate.getMonth() + 3);
      break;
    case 'yearly':
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      break;
    default:
      return null;
  }
  
  // Only return if the next date is before or equal to today
  if (nextDate <= referenceDate) {
    return nextDate;
  }
  
  return null;
}

// Cached Balance Sheet query (5 minute TTL)
const getBalanceSheetCached = memoize(
  async (organizationId: number, asOfDate: Date) => {
    return await storage.getBalanceSheetReport(organizationId, asOfDate);
  },
  {
    promise: true,
    maxAge: 5 * 60 * 1000, // 5 minutes cache
    normalizer: (args) => `${args[0]}-${args[1].toISOString()}`,
    length: 2,
  }
);

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Serve object storage files (logos, uploads, etc.)
  // Only serves PUBLIC files - private files require authentication
  app.get('/objects/*', async (req, res) => {
    try {
      const objectPath = req.path;
      const objectStorageService = new ObjectStorageService();
      const file = await objectStorageService.getObjectEntityFile(objectPath);
      
      // Check ACL policy - only serve public files
      const { getObjectAclPolicy } = await import('./objectAcl');
      const aclPolicy = await getObjectAclPolicy(file);
      
      if (aclPolicy?.visibility !== 'public') {
        return res.status(403).json({ message: "Access denied - file is not public" });
      }
      
      await objectStorageService.downloadObject(file, res);
    } catch (error: any) {
      if (error.name === 'ObjectNotFoundError') {
        res.status(404).json({ message: "File not found" });
      } else {
        console.error("Error serving object storage file:", error);
        res.status(500).json({ message: "Failed to serve file" });
      }
    }
  });

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Organization routes
  app.get('/api/organizations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizations = await storage.getOrganizations(userId);
      res.json(organizations);
    } catch (error) {
      console.error("Error fetching organizations:", error);
      res.status(500).json({ message: "Failed to fetch organizations" });
    }
  });

  app.post('/api/organizations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const data = insertOrganizationSchema.parse(req.body);
      const organization = await storage.createOrganization(data, userId);
      res.status(201).json(organization);
    } catch (error) {
      console.error("Error creating organization:", error);
      res.status(400).json({ message: "Failed to create organization" });
    }
  });

  // Invoice settings routes
  app.patch('/api/organizations/:id/invoice-settings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.id);
      
      // Check user has owner or admin role
      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole || (userRole.role !== 'owner' && userRole.role !== 'admin')) {
        return res.status(403).json({ message: "Only owners and admins can update invoice settings" });
      }

      // Only allow updating invoice-related fields
      const allowedFields: (keyof InsertOrganization)[] = [
        'logoUrl', 'companyName', 'companyAddress', 'companyPhone', 
        'companyEmail', 'companyWebsite', 'taxId', 'invoicePrefix', 'invoiceNotes',
        'invoicePrimaryColor', 'invoiceAccentColor', 'invoiceFontFamily', 'invoiceTemplate',
        'invoicePaymentTerms', 'invoicePaymentMethods', 'invoiceFooter'
      ];
      
      const updates: Partial<InsertOrganization> = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      }

      const updated = await storage.updateOrganization(organizationId, updates);
      res.json(updated);
    } catch (error) {
      console.error("Error updating invoice settings:", error);
      res.status(400).json({ message: "Failed to update invoice settings" });
    }
  });

  app.patch('/api/organizations/:id/logo', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.id);
      
      // Check user has owner or admin role
      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole || (userRole.role !== 'owner' && userRole.role !== 'admin')) {
        return res.status(403).json({ message: "Only owners and admins can update logos" });
      }

      if (!req.body.logoUrl) {
        return res.status(400).json({ message: "logoUrl is required" });
      }

      const objectStorageService = new ObjectStorageService();
      const logoPath = objectStorageService.normalizeObjectEntityPath(req.body.logoUrl);
      
      const updated = await storage.updateOrganization(organizationId, { logoUrl: logoPath });
      res.json(updated);
    } catch (error) {
      console.error("Error updating logo:", error);
      res.status(500).json({ message: "Failed to update logo" });
    }
  });

  // Invitation routes
  app.post('/api/invitations/:organizationId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);
      
      // Check user is owner or admin
      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole || (userRole.role !== 'owner' && userRole.role !== 'admin')) {
        return res.status(403).json({ message: "Only owners and admins can invite users" });
      }

      // Check if user being invited already has access
      const inviteeEmail = req.body.email;
      const existingUser = await storage.getUserByEmail(inviteeEmail);
      if (existingUser) {
        const existingRole = await storage.getUserRole(existingUser.id, organizationId);
        if (existingRole) {
          return res.status(400).json({ message: "This user already has access to this organization" });
        }
      }

      // Generate secure unique invitation token
      const token = crypto.randomUUID();
      
      // Set expiration to 7 days from now
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const invitationData = insertInvitationSchema.parse({
        ...req.body,
        organizationId,
        invitedBy: userId,
        token,
        expiresAt,
        status: 'pending',
      });

      const invitation = await storage.createInvitation(invitationData);
      
      // Get organization and inviter details for email
      const organization = await storage.getOrganization(organizationId);
      const inviter = await storage.getUser(userId);
      const inviterName = inviter ? `${inviter.firstName || ''} ${inviter.lastName || ''}`.trim() || inviter.email : 'Unknown';
      
      // Send invitation email
      const inviteLink = `${req.protocol}://${req.get('host')}/invite/${token}`;
      let emailSent = false;
      
      try {
        const { sendInvitationEmail } = await import('./email');
        await sendInvitationEmail({
          to: invitation.email,
          organizationName: organization?.name || 'Unknown Organization',
          inviterName,
          invitationLink: inviteLink,
          permissions: invitation.permissions || 'view_only',
          expiresAt: invitation.expiresAt,
          branding: organization ? {
            primaryColor: organization.invoicePrimaryColor || undefined,
            accentColor: organization.invoiceAccentColor || undefined,
            fontFamily: organization.invoiceFontFamily || undefined,
            logoUrl: organization.logoUrl || undefined,
            footer: organization.invoiceFooter || undefined,
          } : undefined,
        });
        emailSent = true;
      } catch (emailError: any) {
        console.error("Error sending invitation email:", emailError);
        // Don't fail the invitation creation if email fails
        // Check if it's a SendGrid authorization issue
        if (emailError?.message?.includes('Unauthorized') || emailError?.code === 401) {
          console.log("SendGrid is not properly authorized. Please verify your 'From' email address in SendGrid and ensure your API key has 'Mail Send' permissions.");
        }
      }
      
      res.status(201).json({ ...invitation, inviteLink, emailSent });
    } catch (error) {
      console.error("Error creating invitation:", error);
      res.status(400).json({ message: "Failed to create invitation" });
    }
  });

  app.get('/api/invitations/:organizationId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);
      
      // Check user has access
      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied" });
      }

      const invitations = await storage.getInvitations(organizationId);
      res.json(invitations);
    } catch (error) {
      console.error("Error fetching invitations:", error);
      res.status(500).json({ message: "Failed to fetch invitations" });
    }
  });

  app.get('/api/invitations/accept/:token', async (req: any, res) => {
    try {
      const token = req.params.token;
      
      const invitation = await storage.getInvitationByToken(token);
      if (!invitation) {
        return res.status(404).json({ message: "Invitation not found" });
      }

      if (invitation.status !== 'pending') {
        return res.status(400).json({ message: "Invitation is no longer valid" });
      }

      if (new Date() > new Date(invitation.expiresAt)) {
        return res.status(400).json({ message: "Invitation has expired" });
      }

      // Get organization details
      const organization = await storage.getOrganization(invitation.organizationId);
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }

      // Get inviter details
      const inviter = await storage.getUser(invitation.invitedBy);
      
      res.json({
        id: invitation.id,
        email: invitation.email,
        organizationId: invitation.organizationId,
        organizationName: organization.name,
        role: invitation.role,
        permissions: invitation.permissions,
        inviterName: inviter ? `${inviter.firstName || ''} ${inviter.lastName || ''}`.trim() || inviter.email : 'Unknown',
        status: invitation.status,
        expiresAt: invitation.expiresAt,
      });
    } catch (error) {
      console.error("Error fetching invitation details:", error);
      res.status(500).json({ message: "Failed to fetch invitation details" });
    }
  });

  app.post('/api/invitations/accept/:token', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const token = req.params.token;
      
      const invitation = await storage.getInvitationByToken(token);
      if (!invitation) {
        return res.status(404).json({ message: "Invitation not found" });
      }

      if (invitation.status !== 'pending') {
        return res.status(400).json({ message: "Invitation is no longer valid" });
      }

      if (new Date() > new Date(invitation.expiresAt)) {
        await storage.updateInvitationStatus(invitation.id, 'expired');
        return res.status(400).json({ message: "Invitation has expired" });
      }

      // Check if user already has access
      const existingRole = await storage.getUserRole(userId, invitation.organizationId);
      if (existingRole) {
        return res.status(400).json({ message: "You already have access to this organization" });
      }

      // Create user role
      await storage.createUserRole({
        userId,
        organizationId: invitation.organizationId,
        role: invitation.role,
        permissions: invitation.permissions,
      });

      // Mark invitation as accepted
      await storage.updateInvitationStatus(invitation.id, 'accepted');

      const organization = await storage.getOrganization(invitation.organizationId);
      res.json({ message: "Invitation accepted successfully", organization });
    } catch (error) {
      console.error("Error accepting invitation:", error);
      res.status(500).json({ message: "Failed to accept invitation" });
    }
  });

  app.post('/api/invitations/decline/:token', isAuthenticated, async (req: any, res) => {
    try {
      const token = req.params.token;
      
      const invitation = await storage.getInvitationByToken(token);
      if (!invitation) {
        return res.status(404).json({ message: "Invitation not found" });
      }

      if (invitation.status !== 'pending') {
        return res.status(400).json({ message: "Invitation is no longer valid" });
      }

      // Mark invitation as declined
      await storage.updateInvitationStatus(invitation.id, 'declined');

      res.json({ message: "Invitation declined successfully" });
    } catch (error) {
      console.error("Error declining invitation:", error);
      res.status(500).json({ message: "Failed to decline invitation" });
    }
  });

  app.delete('/api/invitations/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const invitationId = parseInt(req.params.id);
      
      // Get invitation to check permissions
      const invitation = await storage.getInvitationByToken(''); // We need to get by ID
      // For now, we'll trust the user has permission - in production, add proper check
      
      await storage.deleteInvitation(invitationId);
      res.json({ message: "Invitation cancelled" });
    } catch (error) {
      console.error("Error deleting invitation:", error);
      res.status(500).json({ message: "Failed to delete invitation" });
    }
  });

  // Team management routes
  app.get('/api/team/:organizationId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);
      
      // Check user has access
      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied" });
      }

      const members = await storage.getTeamMembers(organizationId);
      res.json(members);
    } catch (error) {
      console.error("Error fetching team members:", error);
      res.status(500).json({ message: "Failed to fetch team members" });
    }
  });

  app.patch('/api/team/:organizationId/:userId/permissions', isAuthenticated, async (req: any, res) => {
    try {
      const currentUserId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);
      const targetUserId = req.params.userId;
      
      // Check user is owner or admin
      const userRole = await storage.getUserRole(currentUserId, organizationId);
      if (!userRole || (userRole.role !== 'owner' && userRole.role !== 'admin')) {
        return res.status(403).json({ message: "Only owners and admins can update permissions" });
      }

      const { permissions } = req.body;
      await storage.updateUserPermissions(targetUserId, organizationId, permissions);
      res.json({ message: "Permissions updated successfully" });
    } catch (error) {
      console.error("Error updating permissions:", error);
      res.status(500).json({ message: "Failed to update permissions" });
    }
  });

  app.patch('/api/team/:organizationId/:userId/role', isAuthenticated, async (req: any, res) => {
    try {
      const currentUserId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);
      const targetUserId = req.params.userId;
      
      // Check user is owner or admin
      const userRole = await storage.getUserRole(currentUserId, organizationId);
      if (!userRole || (userRole.role !== 'owner' && userRole.role !== 'admin')) {
        return res.status(403).json({ message: "Only owners and admins can update roles" });
      }

      const { role } = req.body;
      
      // Validate role
      const validRoles = ['owner', 'admin', 'accountant', 'viewer'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      // Get target user's current role
      const targetUserRole = await storage.getUserRole(targetUserId, organizationId);
      if (!targetUserRole) {
        return res.status(404).json({ message: "User not found in this organization" });
      }

      // SECURITY: Only owners can modify owner roles (promote to owner or demote from owner)
      if ((role === 'owner' || targetUserRole.role === 'owner') && userRole.role !== 'owner') {
        return res.status(403).json({ message: "Only owners can modify owner roles" });
      }

      // SECURITY: Prevent changing your own role if you're the owner
      if (currentUserId === targetUserId && userRole.role === 'owner') {
        return res.status(400).json({ message: "Cannot change your own role as owner" });
      }

      // SECURITY: If demoting an owner, ensure at least one owner remains
      if (targetUserRole.role === 'owner' && role !== 'owner') {
        const allMembers = await storage.getTeamMembers(organizationId);
        const ownerCount = allMembers.filter(m => m.role === 'owner').length;
        
        if (ownerCount <= 1) {
          return res.status(400).json({ message: "Cannot demote the last owner. Promote another member to owner first." });
        }
      }

      // Log role change for audit trail
      await storage.createAuditLog({
        organizationId,
        userId: currentUserId,
        action: 'update',
        entityType: 'user_role',
        entityId: targetUserId,
        changes: { role: { from: targetUserRole.role, to: role } },
        ipAddress: req.ip || 'unknown',
      });

      await storage.updateUserRole(targetUserId, organizationId, role);
      res.json({ message: "Role updated successfully" });
    } catch (error) {
      console.error("Error updating role:", error);
      res.status(500).json({ message: "Failed to update role" });
    }
  });

  app.delete('/api/team/:organizationId/:userId', isAuthenticated, async (req: any, res) => {
    try {
      const currentUserId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);
      const targetUserId = req.params.userId;
      
      // Check user is owner
      const userRole = await storage.getUserRole(currentUserId, organizationId);
      if (!userRole || userRole.role !== 'owner') {
        return res.status(403).json({ message: "Only owners can remove team members" });
      }

      // Prevent removing self if owner
      if (currentUserId === targetUserId) {
        return res.status(400).json({ message: "Cannot remove yourself as owner" });
      }

      await storage.removeTeamMember(targetUserId, organizationId);
      res.json({ message: "Team member removed successfully" });
    } catch (error) {
      console.error("Error removing team member:", error);
      res.status(500).json({ message: "Failed to remove team member" });
    }
  });

  // Category routes
  app.get('/api/categories/:organizationId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);
      
      // Check user has access to this organization
      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      const categories = await storage.getCategories(organizationId);
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  app.post('/api/categories', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const data = insertCategorySchema.parse(req.body);
      
      // Check user has access to this organization
      const userRole = await storage.getUserRole(userId, data.organizationId);
      if (!userRole || (userRole.role !== 'owner' && userRole.role !== 'admin')) {
        return res.status(403).json({ message: "Access denied" });
      }

      const category = await storage.createCategory(data);
      res.status(201).json(category);
    } catch (error) {
      console.error("Error creating category:", error);
      res.status(400).json({ message: "Failed to create category" });
    }
  });

  app.patch('/api/categories/:categoryId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const categoryId = parseInt(req.params.categoryId);
      const updates = req.body;
      
      // Get the category to check organization access
      const category = await storage.getCategory(categoryId);
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      
      // Check user has access to this organization
      const userRole = await storage.getUserRole(userId, category.organizationId);
      if (!userRole || (userRole.role !== 'owner' && userRole.role !== 'admin')) {
        return res.status(403).json({ message: "Access denied" });
      }

      const updatedCategory = await storage.updateCategory(categoryId, updates);
      res.status(200).json(updatedCategory);
    } catch (error) {
      console.error("Error updating category:", error);
      res.status(400).json({ message: "Failed to update category" });
    }
  });

  app.delete('/api/categories/:categoryId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const categoryId = parseInt(req.params.categoryId);
      
      // Get the category to check organization access
      const category = await storage.getCategory(categoryId);
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      
      // Check user has access to this organization
      const userRole = await storage.getUserRole(userId, category.organizationId);
      if (!userRole || (userRole.role !== 'owner' && userRole.role !== 'admin')) {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.deleteCategory(categoryId);
      res.status(200).json({ message: "Category deleted successfully" });
    } catch (error) {
      console.error("Error deleting category:", error);
      res.status(400).json({ message: "Failed to delete category" });
    }
  });

  // Vendor routes
  app.get('/api/vendors/:organizationId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);
      
      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      const vendors = await storage.getVendors(organizationId);
      res.json(vendors);
    } catch (error) {
      console.error("Error fetching vendors:", error);
      res.status(500).json({ message: "Failed to fetch vendors" });
    }
  });

  app.post('/api/vendors', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const data = insertVendorSchema.parse(req.body);
      
      const userRole = await storage.getUserRole(userId, data.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }
      
      if (!hasPermission(userRole.role, userRole.permissions, 'edit_transactions')) {
        return res.status(403).json({ message: "You don't have permission to manage vendors" });
      }

      const vendor = await storage.createVendor(data);
      res.status(201).json(vendor);
    } catch (error) {
      console.error("Error creating vendor:", error);
      res.status(400).json({ message: "Failed to create vendor" });
    }
  });

  app.patch('/api/vendors/:vendorId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const vendorId = parseInt(req.params.vendorId);
      const updates = req.body;
      
      const vendor = await storage.getVendor(vendorId);
      if (!vendor) {
        return res.status(404).json({ message: "Vendor not found" });
      }
      
      const userRole = await storage.getUserRole(userId, vendor.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      if (!hasPermission(userRole.role, userRole.permissions, 'edit_transactions')) {
        return res.status(403).json({ message: "You don't have permission to manage vendors" });
      }

      const updatedVendor = await storage.updateVendor(vendorId, updates);
      res.status(200).json(updatedVendor);
    } catch (error) {
      console.error("Error updating vendor:", error);
      res.status(400).json({ message: "Failed to update vendor" });
    }
  });

  app.delete('/api/vendors/:vendorId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const vendorId = parseInt(req.params.vendorId);
      
      const vendor = await storage.getVendor(vendorId);
      if (!vendor) {
        return res.status(404).json({ message: "Vendor not found" });
      }
      
      const userRole = await storage.getUserRole(userId, vendor.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      if (!hasPermission(userRole.role, userRole.permissions, 'edit_transactions')) {
        return res.status(403).json({ message: "You don't have permission to manage vendors" });
      }

      await storage.deleteVendor(vendorId);
      res.status(200).json({ message: "Vendor deleted successfully" });
    } catch (error) {
      console.error("Error deleting vendor:", error);
      res.status(400).json({ message: "Failed to delete vendor" });
    }
  });

  // Client routes
  app.get('/api/clients/:organizationId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);
      
      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      const clients = await storage.getClients(organizationId);
      res.json(clients);
    } catch (error) {
      console.error("Error fetching clients:", error);
      res.status(500).json({ message: "Failed to fetch clients" });
    }
  });

  app.post('/api/clients', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const data = insertClientSchema.parse(req.body);
      
      const userRole = await storage.getUserRole(userId, data.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }
      
      if (!hasPermission(userRole.role, userRole.permissions, 'edit_transactions')) {
        return res.status(403).json({ message: "You don't have permission to manage clients" });
      }

      const client = await storage.createClient(data);
      res.status(201).json(client);
    } catch (error) {
      console.error("Error creating client:", error);
      res.status(400).json({ message: "Failed to create client" });
    }
  });

  app.patch('/api/clients/:clientId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const clientId = parseInt(req.params.clientId);
      const updates = req.body;
      
      const client = await storage.getClient(clientId);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      const userRole = await storage.getUserRole(userId, client.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      if (!hasPermission(userRole.role, userRole.permissions, 'edit_transactions')) {
        return res.status(403).json({ message: "You don't have permission to manage clients" });
      }

      const updatedClient = await storage.updateClient(clientId, updates);
      res.status(200).json(updatedClient);
    } catch (error) {
      console.error("Error updating client:", error);
      res.status(400).json({ message: "Failed to update client" });
    }
  });

  app.delete('/api/clients/:clientId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const clientId = parseInt(req.params.clientId);
      
      const client = await storage.getClient(clientId);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      const userRole = await storage.getUserRole(userId, client.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      if (!hasPermission(userRole.role, userRole.permissions, 'edit_transactions')) {
        return res.status(403).json({ message: "You don't have permission to manage clients" });
      }

      await storage.deleteClient(clientId);
      res.status(200).json({ message: "Client deleted successfully" });
    } catch (error) {
      console.error("Error deleting client:", error);
      res.status(400).json({ message: "Failed to delete client" });
    }
  });

  // Donor routes
  app.get('/api/donors/:organizationId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);
      
      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      const organization = await storage.getOrganization(organizationId);
      if (!organization || organization.type !== 'nonprofit') {
        return res.status(403).json({ message: "Donor tracking is only available for nonprofit organizations" });
      }

      const donors = await storage.getDonors(organizationId);
      res.json(donors);
    } catch (error) {
      console.error("Error fetching donors:", error);
      res.status(500).json({ message: "Failed to fetch donors" });
    }
  });

  app.post('/api/donors', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const data = req.body;
      
      const userRole = await storage.getUserRole(userId, data.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      const organization = await storage.getOrganization(data.organizationId);
      if (!organization || organization.type !== 'nonprofit') {
        return res.status(403).json({ message: "Donor tracking is only available for nonprofit organizations" });
      }
      
      if (!hasPermission(userRole.role, userRole.permissions, 'edit_transactions')) {
        return res.status(403).json({ message: "You don't have permission to manage donors" });
      }

      const donor = await storage.createDonor(data);
      res.status(201).json(donor);
    } catch (error) {
      console.error("Error creating donor:", error);
      res.status(400).json({ message: "Failed to create donor" });
    }
  });

  app.patch('/api/donors/:donorId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const donorId = parseInt(req.params.donorId);
      const updates = req.body;
      
      const donor = await storage.getDonor(donorId);
      if (!donor) {
        return res.status(404).json({ message: "Donor not found" });
      }
      
      const userRole = await storage.getUserRole(userId, donor.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied" });
      }

      const organization = await storage.getOrganization(donor.organizationId);
      if (!organization || organization.type !== 'nonprofit') {
        return res.status(403).json({ message: "Donor tracking is only available for nonprofit organizations" });
      }
      
      if (!hasPermission(userRole.role, userRole.permissions, 'edit_transactions')) {
        return res.status(403).json({ message: "You don't have permission to manage donors" });
      }

      const updatedDonor = await storage.updateDonor(donorId, updates);
      res.status(200).json(updatedDonor);
    } catch (error) {
      console.error("Error updating donor:", error);
      res.status(400).json({ message: "Failed to update donor" });
    }
  });

  app.delete('/api/donors/:donorId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const donorId = parseInt(req.params.donorId);
      
      const donor = await storage.getDonor(donorId);
      if (!donor) {
        return res.status(404).json({ message: "Donor not found" });
      }
      
      const userRole = await storage.getUserRole(userId, donor.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied" });
      }

      const organization = await storage.getOrganization(donor.organizationId);
      if (!organization || organization.type !== 'nonprofit') {
        return res.status(403).json({ message: "Donor tracking is only available for nonprofit organizations" });
      }
      
      if (!hasPermission(userRole.role, userRole.permissions, 'edit_transactions')) {
        return res.status(403).json({ message: "You don't have permission to manage donors" });
      }

      await storage.deleteDonor(donorId);
      res.status(200).json({ message: "Donor deleted successfully" });
    } catch (error) {
      console.error("Error deleting donor:", error);
      res.status(400).json({ message: "Failed to delete donor" });
    }
  });

  app.get('/api/donation-letters/:organizationId/:year', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);
      const year = parseInt(req.params.year);
      
      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      const organization = await storage.getOrganization(organizationId);
      if (!organization || organization.type !== 'nonprofit') {
        return res.status(403).json({ message: "Donation letters are only available for nonprofit organizations" });
      }

      const donationData = await storage.getDonationsByYear(organizationId, year);
      res.json(donationData);
    } catch (error) {
      console.error("Error fetching donation data:", error);
      res.status(500).json({ message: "Failed to fetch donation data" });
    }
  });

  // Employee routes
  app.get('/api/employees/:organizationId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);
      
      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      const employees = await storage.getEmployees(organizationId);
      res.json(employees);
    } catch (error) {
      console.error("Error fetching employees:", error);
      res.status(500).json({ message: "Failed to fetch employees" });
    }
  });

  app.get('/api/employees/:organizationId/active', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);
      
      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      const employees = await storage.getActiveEmployees(organizationId);
      res.json(employees);
    } catch (error) {
      console.error("Error fetching active employees:", error);
      res.status(500).json({ message: "Failed to fetch active employees" });
    }
  });

  app.post('/api/employees', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const data = insertEmployeeSchema.parse(req.body);
      
      const userRole = await storage.getUserRole(userId, data.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }
      
      if (!hasPermission(userRole.role, userRole.permissions, 'edit_transactions')) {
        return res.status(403).json({ message: "You don't have permission to manage employees" });
      }

      const employee = await storage.createEmployee(data);
      await storage.logCreate(data.organizationId, userId, 'employee', String(employee.id), employee);
      res.status(201).json(employee);
    } catch (error) {
      console.error("Error creating employee:", error);
      res.status(400).json({ message: "Failed to create employee" });
    }
  });

  app.patch('/api/employees/:employeeId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const employeeId = parseInt(req.params.employeeId);
      const updates = req.body;
      
      const employee = await storage.getEmployee(employeeId);
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }
      
      const userRole = await storage.getUserRole(userId, employee.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      if (!hasPermission(userRole.role, userRole.permissions, 'edit_transactions')) {
        return res.status(403).json({ message: "You don't have permission to manage employees" });
      }

      const updatedEmployee = await storage.updateEmployee(employeeId, updates);
      await storage.logUpdate(employee.organizationId, userId, 'employee', String(employeeId), employee, updatedEmployee);
      res.status(200).json(updatedEmployee);
    } catch (error) {
      console.error("Error updating employee:", error);
      res.status(400).json({ message: "Failed to update employee" });
    }
  });

  app.delete('/api/employees/:employeeId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const employeeId = parseInt(req.params.employeeId);
      
      const employee = await storage.getEmployee(employeeId);
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }
      
      const userRole = await storage.getUserRole(userId, employee.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      if (!hasPermission(userRole.role, userRole.permissions, 'edit_transactions')) {
        return res.status(403).json({ message: "You don't have permission to manage employees" });
      }

      await storage.deleteEmployee(employeeId);
      await storage.logDelete(employee.organizationId, userId, 'employee', String(employeeId), employee);
      res.status(200).json({ message: "Employee deleted successfully" });
    } catch (error) {
      console.error("Error deleting employee:", error);
      res.status(400).json({ message: "Failed to delete employee" });
    }
  });

  // Deduction routes
  app.get('/api/deductions/:organizationId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);
      
      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      const deductions = await storage.getDeductions(organizationId);
      res.json(deductions);
    } catch (error) {
      console.error("Error fetching deductions:", error);
      res.status(500).json({ message: "Failed to fetch deductions" });
    }
  });

  app.get('/api/deductions/:organizationId/active', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);
      
      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      const deductions = await storage.getActiveDeductions(organizationId);
      res.json(deductions);
    } catch (error) {
      console.error("Error fetching active deductions:", error);
      res.status(500).json({ message: "Failed to fetch active deductions" });
    }
  });

  app.post('/api/deductions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const data = insertDeductionSchema.parse(req.body);
      
      const userRole = await storage.getUserRole(userId, data.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }
      
      if (!hasPermission(userRole.role, userRole.permissions, 'edit_transactions')) {
        return res.status(403).json({ message: "You don't have permission to manage deductions" });
      }

      const deduction = await storage.createDeduction(data);
      await storage.logCreate(data.organizationId, userId, 'deduction', String(deduction.id), deduction);
      res.status(201).json(deduction);
    } catch (error) {
      console.error("Error creating deduction:", error);
      res.status(400).json({ message: "Failed to create deduction" });
    }
  });

  app.patch('/api/deductions/:deductionId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const deductionId = parseInt(req.params.deductionId);
      const updates = req.body;
      
      const deduction = await storage.getDeduction(deductionId);
      if (!deduction) {
        return res.status(404).json({ message: "Deduction not found" });
      }
      
      const userRole = await storage.getUserRole(userId, deduction.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      if (!hasPermission(userRole.role, userRole.permissions, 'edit_transactions')) {
        return res.status(403).json({ message: "You don't have permission to manage deductions" });
      }

      const updatedDeduction = await storage.updateDeduction(deductionId, updates);
      await storage.logUpdate(deduction.organizationId, userId, 'deduction', String(deductionId), deduction, updatedDeduction);
      res.status(200).json(updatedDeduction);
    } catch (error) {
      console.error("Error updating deduction:", error);
      res.status(400).json({ message: "Failed to update deduction" });
    }
  });

  app.delete('/api/deductions/:deductionId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const deductionId = parseInt(req.params.deductionId);
      
      const deduction = await storage.getDeduction(deductionId);
      if (!deduction) {
        return res.status(404).json({ message: "Deduction not found" });
      }
      
      const userRole = await storage.getUserRole(userId, deduction.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      if (!hasPermission(userRole.role, userRole.permissions, 'edit_transactions')) {
        return res.status(403).json({ message: "You don't have permission to manage deductions" });
      }

      await storage.deleteDeduction(deductionId);
      await storage.logDelete(deduction.organizationId, userId, 'deduction', String(deductionId), deduction);
      res.status(200).json({ message: "Deduction deleted successfully" });
    } catch (error) {
      console.error("Error deleting deduction:", error);
      res.status(400).json({ message: "Failed to delete deduction" });
    }
  });

  // Payroll run routes
  app.get('/api/payroll-runs/:organizationId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);
      
      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      const payrollRuns = await storage.getPayrollRuns(organizationId);
      res.json(payrollRuns);
    } catch (error) {
      console.error("Error fetching payroll runs:", error);
      res.status(500).json({ message: "Failed to fetch payroll runs" });
    }
  });

  app.post('/api/payroll-runs', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const data = insertPayrollRunSchema.parse(req.body);
      
      const userRole = await storage.getUserRole(userId, data.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }
      
      if (!hasPermission(userRole.role, userRole.permissions, 'edit_transactions')) {
        return res.status(403).json({ message: "You don't have permission to manage payroll" });
      }

      const payrollRun = await storage.createPayrollRun(data);
      await storage.logCreate(data.organizationId, userId, 'payroll_run', String(payrollRun.id), payrollRun);
      res.status(201).json(payrollRun);
    } catch (error) {
      console.error("Error creating payroll run:", error);
      res.status(400).json({ message: "Failed to create payroll run" });
    }
  });

  app.patch('/api/payroll-runs/:payrollRunId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const payrollRunId = parseInt(req.params.payrollRunId);
      const updates = req.body;
      
      const payrollRun = await storage.getPayrollRun(payrollRunId);
      if (!payrollRun) {
        return res.status(404).json({ message: "Payroll run not found" });
      }
      
      const userRole = await storage.getUserRole(userId, payrollRun.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      if (!hasPermission(userRole.role, userRole.permissions, 'edit_transactions')) {
        return res.status(403).json({ message: "You don't have permission to manage payroll" });
      }

      const updatedPayrollRun = await storage.updatePayrollRun(payrollRunId, updates);
      await storage.logUpdate(payrollRun.organizationId, userId, 'payroll_run', String(payrollRunId), payrollRun, updatedPayrollRun);
      res.status(200).json(updatedPayrollRun);
    } catch (error) {
      console.error("Error updating payroll run:", error);
      res.status(400).json({ message: "Failed to update payroll run" });
    }
  });

  app.delete('/api/payroll-runs/:payrollRunId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const payrollRunId = parseInt(req.params.payrollRunId);
      
      const payrollRun = await storage.getPayrollRun(payrollRunId);
      if (!payrollRun) {
        return res.status(404).json({ message: "Payroll run not found" });
      }
      
      const userRole = await storage.getUserRole(userId, payrollRun.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      if (!hasPermission(userRole.role, userRole.permissions, 'edit_transactions')) {
        return res.status(403).json({ message: "You don't have permission to manage payroll" });
      }

      await storage.deletePayrollRun(payrollRunId);
      await storage.logDelete(payrollRun.organizationId, userId, 'payroll_run', String(payrollRunId), payrollRun);
      res.status(200).json({ message: "Payroll run deleted successfully" });
    } catch (error) {
      console.error("Error deleting payroll run:", error);
      res.status(400).json({ message: "Failed to delete payroll run" });
    }
  });

  app.post('/api/payroll-runs/:payrollRunId/process', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const payrollRunId = parseInt(req.params.payrollRunId);
      
      const payrollRun = await storage.getPayrollRun(payrollRunId);
      if (!payrollRun) {
        return res.status(404).json({ message: "Payroll run not found" });
      }
      
      const userRole = await storage.getUserRole(userId, payrollRun.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      if (!hasPermission(userRole.role, userRole.permissions, 'edit_transactions')) {
        return res.status(403).json({ message: "You don't have permission to process payroll" });
      }

      if (payrollRun.status !== 'draft') {
        return res.status(400).json({ message: "Only draft payroll runs can be processed" });
      }

      const processedPayrollRun = await storage.processPayrollRun(payrollRunId, userId);
      await storage.logUpdate(payrollRun.organizationId, userId, 'payroll_run', String(payrollRunId), payrollRun, processedPayrollRun);
      res.status(200).json(processedPayrollRun);
    } catch (error) {
      console.error("Error processing payroll run:", error);
      res.status(400).json({ message: "Failed to process payroll run" });
    }
  });

  // Payroll item routes
  app.get('/api/payroll-items/:payrollRunId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const payrollRunId = parseInt(req.params.payrollRunId);
      
      const payrollRun = await storage.getPayrollRun(payrollRunId);
      if (!payrollRun) {
        return res.status(404).json({ message: "Payroll run not found" });
      }
      
      const userRole = await storage.getUserRole(userId, payrollRun.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied" });
      }

      const payrollItems = await storage.getPayrollItems(payrollRunId);
      res.json(payrollItems);
    } catch (error) {
      console.error("Error fetching payroll items:", error);
      res.status(500).json({ message: "Failed to fetch payroll items" });
    }
  });

  app.post('/api/payroll-items', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Validate request payload - only accept minimal data
      const requestSchema = z.object({
        payrollRunId: z.number().int().positive(),
        employeeId: z.number().int().positive(),
        hoursWorked: z.number().positive().optional(),
      });
      const { payrollRunId, employeeId, hoursWorked } = requestSchema.parse(req.body);
      
      // Fetch payroll run
      const payrollRun = await storage.getPayrollRun(payrollRunId);
      if (!payrollRun) {
        return res.status(404).json({ message: "Payroll run not found" });
      }
      
      // Check permissions
      const userRole = await storage.getUserRole(userId, payrollRun.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      if (!hasPermission(userRole.role, userRole.permissions, 'edit_transactions')) {
        return res.status(403).json({ message: "You don't have permission to manage payroll" });
      }

      // Check if payroll run is in draft status
      if (payrollRun.status !== 'draft') {
        return res.status(400).json({ message: "Cannot add employees to a processed payroll run" });
      }

      // Fetch employee
      const employee = await storage.getEmployee(employeeId);
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }

      // Verify employee belongs to the same organization
      if (employee.organizationId !== payrollRun.organizationId) {
        return res.status(400).json({ message: "Employee does not belong to this organization" });
      }

      // Check for duplicate employee in this payroll run
      const existingItems = await storage.getPayrollItems(payrollRunId);
      if (existingItems.find((item: any) => item.employeeId === employeeId)) {
        return res.status(400).json({ message: "Employee is already in this payroll run" });
      }

      // Validate hours for hourly employees
      if (employee.payType === 'hourly') {
        if (!hoursWorked || hoursWorked <= 0) {
          return res.status(400).json({ message: "Hours worked is required for hourly employees" });
        }
      }

      // Calculate gross pay SERVER-SIDE
      let grossPay = 0;
      if (employee.payType === 'hourly') {
        grossPay = parseFloat(employee.payRate) * hoursWorked!;
      } else {
        // Salary - calculate based on pay schedule
        const annualSalary = parseFloat(employee.payRate);
        if (employee.paySchedule === 'weekly') {
          grossPay = annualSalary / 52;
        } else if (employee.paySchedule === 'biweekly') {
          grossPay = annualSalary / 26;
        } else if (employee.paySchedule === 'semimonthly') {
          grossPay = annualSalary / 24;
        } else {
          grossPay = annualSalary / 12;
        }
      }

      // Fetch active deductions and calculate SERVER-SIDE
      const deductions = await storage.getActiveDeductions(payrollRun.organizationId);
      let totalDeductions = 0;
      const deductionDetails: Record<string, string> = {};
      
      for (const deduction of deductions) {
        let deductionAmount = 0;
        if (deduction.calculationType === 'percentage') {
          deductionAmount = (grossPay * parseFloat(deduction.amount)) / 100;
        } else {
          deductionAmount = parseFloat(deduction.amount);
        }
        totalDeductions += deductionAmount;
        deductionDetails[deduction.name] = deductionAmount.toFixed(2);
      }

      const netPay = grossPay - totalDeductions;

      // Validate all amounts are positive
      if (grossPay <= 0 || netPay < 0) {
        return res.status(400).json({ message: "Invalid pay calculation" });
      }

      // Create payroll item with server-calculated amounts
      const payrollItemData = {
        payrollRunId,
        employeeId,
        hoursWorked: employee.payType === 'hourly' ? hoursWorked! : null,
        grossPay: grossPay.toFixed(2),
        totalDeductions: totalDeductions.toFixed(2),
        netPay: netPay.toFixed(2),
        deductionDetails: JSON.stringify(deductionDetails),
      };

      const payrollItem = await storage.createPayrollItem(payrollItemData);

      // Update payroll run totals
      const updatedItems = await storage.getPayrollItems(payrollRunId);
      const totalGross = updatedItems.reduce((sum: number, item: any) => sum + parseFloat(item.grossPay), 0);
      const totalDeds = updatedItems.reduce((sum: number, item: any) => sum + parseFloat(item.totalDeductions), 0);
      const totalNet = updatedItems.reduce((sum: number, item: any) => sum + parseFloat(item.netPay), 0);

      await storage.updatePayrollRun(payrollRunId, {
        totalGross: totalGross.toFixed(2),
        totalDeductions: totalDeds.toFixed(2),
        totalNet: totalNet.toFixed(2),
      });

      res.status(201).json(payrollItem);
    } catch (error) {
      console.error("Error creating payroll item:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(400).json({ message: "Failed to create payroll item" });
    }
  });

  app.patch('/api/payroll-items/:payrollItemId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const payrollItemId = parseInt(req.params.payrollItemId);
      
      // Only allow hoursWorked to be updated - validate request
      const updateSchema = z.object({
        hoursWorked: z.number().positive(),
      });
      const { hoursWorked } = updateSchema.parse(req.body);
      
      // Fetch payroll item
      const payrollItem = await storage.getPayrollItem(payrollItemId);
      if (!payrollItem) {
        return res.status(404).json({ message: "Payroll item not found" });
      }
      
      // Fetch payroll run
      const payrollRun = await storage.getPayrollRun(payrollItem.payrollRunId);
      if (!payrollRun) {
        return res.status(404).json({ message: "Payroll run not found" });
      }

      // Check if payroll run is in draft status
      if (payrollRun.status !== 'draft') {
        return res.status(400).json({ message: "Cannot update payroll items in a processed payroll run" });
      }
      
      // Check permissions
      const userRole = await storage.getUserRole(userId, payrollRun.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      if (!hasPermission(userRole.role, userRole.permissions, 'edit_transactions')) {
        return res.status(403).json({ message: "You don't have permission to manage payroll" });
      }

      // Fetch employee to recalculate
      const employee = await storage.getEmployee(payrollItem.employeeId);
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }

      // Ensure employee is hourly (only hourly employees have hours)
      if (employee.payType !== 'hourly') {
        return res.status(400).json({ message: "Cannot update hours for salary employees" });
      }

      // Recalculate gross pay SERVER-SIDE
      const grossPay = parseFloat(employee.payRate) * hoursWorked;

      // Fetch active deductions and recalculate SERVER-SIDE
      const deductions = await storage.getActiveDeductions(payrollRun.organizationId);
      let totalDeductions = 0;
      const deductionDetails: Record<string, string> = {};
      
      for (const deduction of deductions) {
        let deductionAmount = 0;
        if (deduction.calculationType === 'percentage') {
          deductionAmount = (grossPay * parseFloat(deduction.amount)) / 100;
        } else {
          deductionAmount = parseFloat(deduction.amount);
        }
        totalDeductions += deductionAmount;
        deductionDetails[deduction.name] = deductionAmount.toFixed(2);
      }

      const netPay = grossPay - totalDeductions;

      // Validate all amounts are positive
      if (grossPay <= 0 || netPay < 0) {
        return res.status(400).json({ message: "Invalid pay calculation" });
      }

      // Update payroll item with recalculated amounts
      const updatedPayrollItem = await storage.updatePayrollItem(payrollItemId, {
        hoursWorked,
        grossPay: grossPay.toFixed(2),
        totalDeductions: totalDeductions.toFixed(2),
        netPay: netPay.toFixed(2),
        deductionDetails: JSON.stringify(deductionDetails),
      });

      // Update payroll run totals
      const updatedItems = await storage.getPayrollItems(payrollRun.id);
      const totalGross = updatedItems.reduce((sum: number, item: any) => sum + parseFloat(item.grossPay), 0);
      const totalDeds = updatedItems.reduce((sum: number, item: any) => sum + parseFloat(item.totalDeductions), 0);
      const totalNet = updatedItems.reduce((sum: number, item: any) => sum + parseFloat(item.netPay), 0);

      await storage.updatePayrollRun(payrollRun.id, {
        totalGross: totalGross.toFixed(2),
        totalDeductions: totalDeds.toFixed(2),
        totalNet: totalNet.toFixed(2),
      });

      res.status(200).json(updatedPayrollItem);
    } catch (error) {
      console.error("Error updating payroll item:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(400).json({ message: "Failed to update payroll item" });
    }
  });

  app.delete('/api/payroll-items/:payrollItemId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const payrollItemId = parseInt(req.params.payrollItemId);
      
      const payrollItem = await storage.getPayrollItem(payrollItemId);
      if (!payrollItem) {
        return res.status(404).json({ message: "Payroll item not found" });
      }
      
      const payrollRun = await storage.getPayrollRun(payrollItem.payrollRunId);
      if (!payrollRun) {
        return res.status(404).json({ message: "Payroll run not found" });
      }
      
      const userRole = await storage.getUserRole(userId, payrollRun.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      if (!hasPermission(userRole.role, userRole.permissions, 'edit_transactions')) {
        return res.status(403).json({ message: "You don't have permission to manage payroll" });
      }

      await storage.deletePayrollItem(payrollItemId);
      res.status(200).json({ message: "Payroll item deleted successfully" });
    } catch (error) {
      console.error("Error deleting payroll item:", error);
      res.status(400).json({ message: "Failed to delete payroll item" });
    }
  });

  app.get('/api/payroll-item-deductions/:payrollItemId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const payrollItemId = parseInt(req.params.payrollItemId);
      
      const payrollItem = await storage.getPayrollItem(payrollItemId);
      if (!payrollItem) {
        return res.status(404).json({ message: "Payroll item not found" });
      }
      
      const payrollRun = await storage.getPayrollRun(payrollItem.payrollRunId);
      if (!payrollRun) {
        return res.status(404).json({ message: "Payroll run not found" });
      }
      
      const userRole = await storage.getUserRole(userId, payrollRun.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied" });
      }

      const deductions = await storage.getPayrollItemDeductions(payrollItemId);
      res.json(deductions);
    } catch (error) {
      console.error("Error fetching payroll item deductions:", error);
      res.status(500).json({ message: "Failed to fetch payroll item deductions" });
    }
  });

  // Transaction routes
  app.get('/api/transactions/:organizationId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);
      
      // Check user has access to this organization
      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      const transactions = await storage.getTransactions(organizationId);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  app.post('/api/transactions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const data = insertTransactionSchema.parse(req.body);
      
      // Check user has access and permission to edit transactions
      const userRole = await storage.getUserRole(userId, data.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }
      
      if (!hasPermission(userRole.role, userRole.permissions, 'edit_transactions')) {
        return res.status(403).json({ message: "You don't have permission to edit transactions" });
      }

      const transaction = await storage.createTransaction(data);
      
      // Log audit trail
      await storage.logCreate(data.organizationId, userId, 'transaction', transaction.id.toString(), transaction);
      
      res.status(201).json(transaction);
    } catch (error) {
      console.error("Error creating transaction:", error);
      res.status(400).json({ message: "Failed to create transaction" });
    }
  });

  app.patch('/api/transactions/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const transactionId = parseInt(req.params.id);
      
      // Parse and validate the updates through the insert schema (partial)
      const updates = insertTransactionSchema.partial().parse(req.body);

      // Get the existing transaction first
      const existingTransaction = await storage.getTransaction(transactionId);
      
      if (!existingTransaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }

      // Check user has access and permission to edit transactions
      const userRole = await storage.getUserRole(userId, existingTransaction.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }
      
      if (!hasPermission(userRole.role, userRole.permissions, 'edit_transactions')) {
        return res.status(403).json({ message: "You don't have permission to edit transactions" });
      }

      const updatedTransaction = await storage.updateTransaction(transactionId, updates);
      
      // Log audit trail
      await storage.logUpdate(existingTransaction.organizationId, userId, 'transaction', transactionId.toString(), existingTransaction, updates);
      
      res.json(updatedTransaction);
    } catch (error) {
      console.error("Error updating transaction:", error);
      res.status(400).json({ message: "Failed to update transaction" });
    }
  });

  app.delete('/api/transactions/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const transactionId = parseInt(req.params.id);

      // Get the existing transaction first
      const existingTransaction = await storage.getTransaction(transactionId);
      
      if (!existingTransaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }

      // Check user has access and permission to edit transactions
      const userRole = await storage.getUserRole(userId, existingTransaction.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }
      
      if (!hasPermission(userRole.role, userRole.permissions, 'edit_transactions')) {
        return res.status(403).json({ message: "You don't have permission to edit transactions" });
      }

      await storage.deleteTransaction(transactionId);
      
      // Log audit trail
      await storage.logDelete(existingTransaction.organizationId, userId, 'transaction', transactionId.toString(), existingTransaction);
      
      res.status(200).json({ message: "Transaction deleted successfully" });
    } catch (error) {
      console.error("Error deleting transaction:", error);
      res.status(500).json({ message: "Failed to delete transaction" });
    }
  });

  // Bulk Operations for Transactions
  app.post('/api/transactions/bulk-categorize', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { transactionIds, categoryId, fundId, programId, functionalCategory } = req.body;

      if (!Array.isArray(transactionIds) || transactionIds.length === 0) {
        return res.status(400).json({ message: "transactionIds must be a non-empty array" });
      }

      // Load ALL transactions and validate they belong to the same organization
      const transactions = [];
      const invalidIds = [];
      
      for (const id of transactionIds) {
        const transaction = await storage.getTransaction(id);
        if (!transaction) {
          invalidIds.push(id);
        } else {
          transactions.push(transaction);
        }
      }

      if (invalidIds.length > 0) {
        return res.status(404).json({ 
          message: `Transaction(s) not found`,
          invalidIds 
        });
      }

      // Verify all transactions belong to the same organization
      const organizationIds = [...new Set(transactions.map(t => t.organizationId))];
      if (organizationIds.length !== 1) {
        return res.status(400).json({ 
          message: "All transactions must belong to the same organization" 
        });
      }

      const organizationId = organizationIds[0];

      // Check user has access and permission
      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      if (!hasPermission(userRole.role, userRole.permissions, 'edit_transactions')) {
        return res.status(403).json({ message: "You don't have permission to edit transactions" });
      }

      // Build updates object
      const updates: any = {};
      if (categoryId !== undefined) updates.categoryId = categoryId;
      if (fundId !== undefined) updates.fundId = fundId;
      if (programId !== undefined) updates.programId = programId;
      if (functionalCategory !== undefined) updates.functionalCategory = functionalCategory;

      // Update all transactions
      const updatedTransactions = [];
      for (const id of transactionIds) {
        const updated = await storage.updateTransaction(id, updates);
        updatedTransactions.push(updated);
      }

      // Log audit trail
      await storage.logCreate(
        organizationId,
        userId,
        'bulk_operation',
        'bulk_categorize',
        { transactionIds, updates, count: transactionIds.length }
      );

      res.json({ 
        message: `Successfully updated ${updatedTransactions.length} transactions`,
        updated: updatedTransactions 
      });
    } catch (error) {
      console.error("Error bulk categorizing transactions:", error);
      res.status(500).json({ message: "Failed to bulk categorize transactions" });
    }
  });

  app.post('/api/transactions/bulk-delete', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { transactionIds } = req.body;

      if (!Array.isArray(transactionIds) || transactionIds.length === 0) {
        return res.status(400).json({ message: "transactionIds must be a non-empty array" });
      }

      // Load ALL transactions and validate they belong to the same organization
      const transactions = [];
      const invalidIds = [];
      
      for (const id of transactionIds) {
        const transaction = await storage.getTransaction(id);
        if (!transaction) {
          invalidIds.push(id);
        } else {
          transactions.push(transaction);
        }
      }

      if (invalidIds.length > 0) {
        return res.status(404).json({ 
          message: `Transaction(s) not found`,
          invalidIds 
        });
      }

      // Verify all transactions belong to the same organization
      const organizationIds = [...new Set(transactions.map(t => t.organizationId))];
      if (organizationIds.length !== 1) {
        return res.status(400).json({ 
          message: "All transactions must belong to the same organization" 
        });
      }

      const organizationId = organizationIds[0];

      // Check user has access and permission
      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      if (!hasPermission(userRole.role, userRole.permissions, 'edit_transactions')) {
        return res.status(403).json({ message: "You don't have permission to delete transactions" });
      }

      // Delete all transactions
      for (const id of transactionIds) {
        await storage.deleteTransaction(id);
      }

      // Log audit trail
      await storage.logCreate(
        organizationId,
        userId,
        'bulk_operation',
        'bulk_delete',
        { transactionIds, count: transactionIds.length }
      );

      res.json({ message: `Successfully deleted ${transactionIds.length} transactions` });
    } catch (error) {
      console.error("Error bulk deleting transactions:", error);
      res.status(500).json({ message: "Failed to bulk delete transactions" });
    }
  });

  // Configure multer for CSV file uploads
  const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
      if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
        cb(null, true);
      } else {
        cb(new Error('Only CSV files are allowed'));
      }
    }
  });

  // Configure multer for logo uploads
  const logoUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed'));
      }
    }
  });

  // Logo upload route
  app.post('/api/organizations/:id/logo', isAuthenticated, logoUpload.single('logo'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.id);
      
      // Check user has owner or admin role
      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole || (userRole.role !== 'owner' && userRole.role !== 'admin')) {
        return res.status(403).json({ message: "Only owners and admins can upload logos" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No logo file provided" });
      }

      // Upload to object storage
      const objectStorageService = new ObjectStorageService();
      const uploadUrl = await objectStorageService.getObjectEntityUploadURL();
      
      // Upload file to object storage using signed URL
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: req.file.buffer,
        headers: {
          'Content-Type': req.file.mimetype,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload to object storage');
      }

      // Set the logo as public so it can be accessed via /objects/* route
      const rawPath = uploadUrl.split('?')[0];
      const logoPath = await objectStorageService.trySetObjectEntityAclPolicy(rawPath, {
        visibility: 'public',
      });
      
      // Save logo URL to organization
      const updated = await storage.updateOrganization(organizationId, { logoUrl: logoPath });
      
      res.json(updated);
    } catch (error) {
      console.error("Error uploading logo:", error);
      res.status(500).json({ message: "Failed to upload logo" });
    }
  });

  app.post('/api/transactions/import-csv/:organizationId', isAuthenticated, upload.single('file'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);

      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      if (!hasPermission(userRole.role, userRole.permissions, 'edit_transactions')) {
        return res.status(403).json({ message: "You don't have permission to import transactions" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Parse CSV
      const csvContent = req.file.buffer.toString('utf-8');
      const parseResult = Papa.parse(csvContent, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true
      });

      if (parseResult.errors.length > 0) {
        return res.status(400).json({ 
          message: "CSV parsing errors", 
          errors: parseResult.errors 
        });
      }

      // Validate and create transactions
      const created = [];
      const errors = [];

      for (let i = 0; i < parseResult.data.length; i++) {
        const row: any = parseResult.data[i];
        
        try {
          // Clean amount: remove currency symbols, commas, and convert to number
          const rawAmount = row.amount || row.Amount || '0';
          const hasNegativeSign = String(rawAmount).includes('-');
          const cleanAmount = typeof rawAmount === 'string' 
            ? rawAmount.replace(/[$,\-]/g, '').trim() 
            : String(rawAmount);
          const parsedAmount = parseFloat(cleanAmount);
          const validAmount = isNaN(parsedAmount) ? 0 : parsedAmount;

          // Determine transaction type
          const rawType = (row.type || row.Type || '').toString().toLowerCase().trim();
          let transactionType: 'income' | 'expense';
          
          // If CSV has no type column, use amount sign (negative = expense, positive = income)
          if (!rawType || rawType === '') {
            transactionType = hasNegativeSign ? 'expense' : 'income';
          } else {
            // CSV has a type column - map common variations
            if (rawType.includes('deposit') || 
                rawType.includes('credit') || 
                rawType.includes('income') || 
                rawType.includes('payment received') ||
                rawType.includes('revenue') ||
                rawType.includes('transfer in')) {
              transactionType = 'income';
            } else if (rawType.includes('withdrawal') || 
                       rawType.includes('debit') || 
                       rawType.includes('expense') || 
                       rawType.includes('payment') ||
                       rawType.includes('charge')) {
              transactionType = 'expense';
            } else if (rawType.includes('transfer')) {
              // For generic "transfer", use amount sign
              transactionType = hasNegativeSign ? 'expense' : 'income';
            } else {
              // Unknown type, default to amount sign
              transactionType = hasNegativeSign ? 'expense' : 'income';
            }
          }

          // Map CSV columns to transaction schema
          const transactionData = {
            organizationId,
            createdBy: userId,
            date: row.date || row.Date || new Date().toISOString().split('T')[0],
            type: transactionType,
            amount: validAmount,
            description: row.description || row.Description || '',
            categoryId: row.categoryId || row.CategoryId || null,
            vendorId: row.vendorId || row.VendorId || null,
            clientId: row.clientId || row.ClientId || null,
            fundId: row.fundId || row.FundId || null,
            programId: row.programId || row.ProgramId || null,
            functionalCategory: row.functionalCategory || row.FunctionalCategory || null,
          };

          const validated = insertTransactionSchema.parse(transactionData);
          const transaction = await storage.createTransaction(validated);
          created.push(transaction);
        } catch (error: any) {
          console.error(`CSV Import Error on row ${i + 1}:`, error);
          errors.push({
            row: i + 1,
            data: row,
            error: error.message || JSON.stringify(error)
          });
        }
      }

      // Log audit trail
      await storage.logCreate(
        organizationId,
        userId,
        'bulk_operation',
        'csv_import',
        { imported: created.length, errors: errors.length, totalRows: parseResult.data.length }
      );

      res.json({
        message: `Import complete: ${created.length} transactions created, ${errors.length} errors`,
        created,
        errors,
        summary: {
          total: parseResult.data.length,
          success: created.length,
          failed: errors.length
        }
      });
    } catch (error) {
      console.error("Error importing CSV:", error);
      res.status(500).json({ message: "Failed to import CSV" });
    }
  });

  app.get('/api/transactions/export/:organizationId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);

      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      const transactions = await storage.getTransactions(organizationId);
      
      // Convert to CSV format
      const headers = ['Date', 'Type', 'Amount', 'Category', 'Description', 'Vendor/Client', 'Fund', 'Program', 'Functional Category'];
      const rows = transactions.map(t => [
        t.date,
        t.type,
        t.amount,
        t.categoryId || '',
        t.description || '',
        t.vendorId || t.clientId || '',
        t.fundId || '',
        t.programId || '',
        t.functionalCategory || ''
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="transactions-${organizationId}-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csvContent);
    } catch (error) {
      console.error("Error exporting transactions:", error);
      res.status(500).json({ message: "Failed to export transactions" });
    }
  });

  // Bulk Approval Operations
  app.post('/api/expense-approvals/bulk-action', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { approvalIds, action, note } = req.body;

      if (!Array.isArray(approvalIds) || approvalIds.length === 0) {
        return res.status(400).json({ message: "approvalIds must be a non-empty array" });
      }

      if (!['approve', 'reject'].includes(action)) {
        return res.status(400).json({ message: "action must be 'approve' or 'reject'" });
      }

      // Load ALL approvals and validate they belong to the same organization
      const approvals = [];
      const invalidIds = [];
      
      for (const id of approvalIds) {
        const approval = await storage.getExpenseApproval(id);
        if (!approval) {
          invalidIds.push(id);
        } else {
          approvals.push(approval);
        }
      }

      if (invalidIds.length > 0) {
        return res.status(404).json({ 
          message: `Expense approval(s) not found`,
          invalidIds 
        });
      }

      // Verify all approvals belong to the same organization
      const organizationIds = [...new Set(approvals.map(a => a.organizationId))];
      if (organizationIds.length !== 1) {
        return res.status(400).json({ 
          message: "All expense approvals must belong to the same organization" 
        });
      }

      const organizationId = organizationIds[0];

      // Check user has access and permission
      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      if (userRole.role !== 'owner' && userRole.role !== 'admin') {
        return res.status(403).json({ message: "Only owners and admins can approve/reject expenses" });
      }

      // Update all approvals
      const updatedApprovals = [];
      for (const id of approvalIds) {
        const updated = await storage.updateExpenseApproval(id, {
          status: action === 'approve' ? 'approved' : 'rejected',
          approvedBy: userId,
          approvedAt: new Date().toISOString(),
          notes: note || ''
        });
        updatedApprovals.push(updated);
      }

      // Log audit trail
      await storage.logCreate(
        organizationId,
        userId,
        'bulk_operation',
        'bulk_approval',
        { approvalIds, action, count: approvalIds.length }
      );

      res.json({ 
        message: `Successfully ${action}d ${updatedApprovals.length} expense approvals`,
        updated: updatedApprovals 
      });
    } catch (error) {
      console.error("Error bulk processing expense approvals:", error);
      res.status(500).json({ message: "Failed to bulk process expense approvals" });
    }
  });

  // Bank Reconciliation routes
  app.get('/api/reconciliation/unreconciled/:organizationId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);
      
      // Check user has access
      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      const unreconciledTransactions = await storage.getUnreconciledTransactions(organizationId);
      res.json(unreconciledTransactions);
    } catch (error) {
      console.error("Error fetching unreconciled transactions:", error);
      res.status(500).json({ message: "Failed to fetch unreconciled transactions" });
    }
  });

  app.post('/api/reconciliation/reconcile/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const transactionId = parseInt(req.params.id);

      // Get the transaction
      const transaction = await storage.getTransaction(transactionId);
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }

      // Check user has access and permission
      const userRole = await storage.getUserRole(userId, transaction.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      if (!hasPermission(userRole.role, userRole.permissions, 'edit_transactions')) {
        return res.status(403).json({ message: "You don't have permission to reconcile transactions" });
      }

      const reconciledTransaction = await storage.reconcileTransaction(transactionId, userId);
      res.json(reconciledTransaction);
    } catch (error) {
      console.error("Error reconciling transaction:", error);
      res.status(500).json({ message: "Failed to reconcile transaction" });
    }
  });

  app.post('/api/reconciliation/unreconcile/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const transactionId = parseInt(req.params.id);

      // Get the transaction
      const transaction = await storage.getTransaction(transactionId);
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }

      // Check user has access and permission
      const userRole = await storage.getUserRole(userId, transaction.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      if (!hasPermission(userRole.role, userRole.permissions, 'edit_transactions')) {
        return res.status(403).json({ message: "You don't have permission to unreconcile transactions" });
      }

      const unreconciledTransaction = await storage.unreconcileTransaction(transactionId);
      res.json(unreconciledTransaction);
    } catch (error) {
      console.error("Error unreconciling transaction:", error);
      res.status(500).json({ message: "Failed to unreconcile transaction" });
    }
  });

  app.post('/api/reconciliation/bulk-reconcile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { organizationId, transactionIds } = req.body;

      if (!Array.isArray(transactionIds) || transactionIds.length === 0) {
        return res.status(400).json({ message: "Invalid transaction IDs" });
      }

      // Check user has access and permission
      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      if (!hasPermission(userRole.role, userRole.permissions, 'edit_transactions')) {
        return res.status(403).json({ message: "You don't have permission to reconcile transactions" });
      }

      const count = await storage.bulkReconcileTransactions(transactionIds, userId);
      res.json({ count });
    } catch (error) {
      console.error("Error bulk reconciling transactions:", error);
      res.status(500).json({ message: "Failed to reconcile transactions" });
    }
  });

  app.post('/api/reconciliation/auto-reconcile/:organizationId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);

      // Check user has access and permission
      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      if (!hasPermission(userRole.role, userRole.permissions, 'edit_transactions')) {
        return res.status(403).json({ message: "You don't have permission to auto-reconcile transactions" });
      }

      const result = await storage.autoReconcileTransactions(organizationId);
      res.json(result);
    } catch (error) {
      console.error("Error auto-reconciling transactions:", error);
      res.status(500).json({ message: "Failed to auto-reconcile transactions" });
    }
  });

  // Recurring Transaction routes
  app.get('/api/recurring-transactions/:organizationId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);
      
      // Check user has access
      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      const recurringTransactions = await storage.getRecurringTransactions(organizationId);
      res.json(recurringTransactions);
    } catch (error) {
      console.error("Error fetching recurring transactions:", error);
      res.status(500).json({ message: "Failed to fetch recurring transactions" });
    }
  });

  app.post('/api/recurring-transactions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { organizationId, startDate, endDate, ...data } = req.body;
      
      // Check user has access and permission to edit transactions
      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }
      
      if (!hasPermission(userRole.role, userRole.permissions, 'edit_transactions')) {
        return res.status(403).json({ message: "You don't have permission to create recurring transactions" });
      }

      // Convert date strings to Date objects
      const recurringData: any = {
        organizationId,
        ...data,
        createdBy: userId,
        startDate: startDate ? new Date(startDate) : undefined,
      };
      
      if (endDate) {
        recurringData.endDate = new Date(endDate);
      }

      const recurringTransaction = await storage.createRecurringTransaction(recurringData);
      
      res.status(201).json(recurringTransaction);
    } catch (error) {
      console.error("Error creating recurring transaction:", error);
      res.status(400).json({ message: "Failed to create recurring transaction" });
    }
  });

  app.patch('/api/recurring-transactions/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      const { startDate, endDate, ...updates } = req.body;

      // Get the existing recurring transaction
      const existing = await storage.getRecurringTransaction(id);
      
      if (!existing) {
        return res.status(404).json({ message: "Recurring transaction not found" });
      }

      // Check user has access and permission
      const userRole = await storage.getUserRole(userId, existing.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }
      
      if (!hasPermission(userRole.role, userRole.permissions, 'edit_transactions')) {
        return res.status(403).json({ message: "You don't have permission to edit recurring transactions" });
      }

      // Convert date strings to Date objects if present
      const updateData: any = { ...updates };
      if (startDate) {
        updateData.startDate = new Date(startDate);
      }
      if (endDate) {
        updateData.endDate = new Date(endDate);
      }

      const updated = await storage.updateRecurringTransaction(id, updateData);
      res.json(updated);
    } catch (error) {
      console.error("Error updating recurring transaction:", error);
      res.status(400).json({ message: "Failed to update recurring transaction" });
    }
  });

  app.delete('/api/recurring-transactions/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);

      // Get the existing recurring transaction
      const existing = await storage.getRecurringTransaction(id);
      
      if (!existing) {
        return res.status(404).json({ message: "Recurring transaction not found" });
      }

      // Check user has access and permission
      const userRole = await storage.getUserRole(userId, existing.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }
      
      if (!hasPermission(userRole.role, userRole.permissions, 'edit_transactions')) {
        return res.status(403).json({ message: "You don't have permission to delete recurring transactions" });
      }

      await storage.deleteRecurringTransaction(id);
      res.status(200).json({ message: "Recurring transaction deleted successfully" });
    } catch (error) {
      console.error("Error deleting recurring transaction:", error);
      res.status(500).json({ message: "Failed to delete recurring transaction" });
    }
  });

  app.post('/api/recurring-transactions/generate/:organizationId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);
      
      // Check user has access and permission
      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }
      
      if (!hasPermission(userRole.role, userRole.permissions, 'edit_transactions')) {
        return res.status(403).json({ message: "You don't have permission to generate transactions" });
      }

      const recurringTransactions = await storage.getRecurringTransactions(organizationId);
      const activeRecurring = recurringTransactions.filter(rt => rt.isActive === 1);
      
      const now = new Date();
      const generatedCount = { count: 0 };

      for (const recurring of activeRecurring) {
        const nextDate = getNextOccurrence(recurring, now);
        
        if (nextDate && (!recurring.endDate || nextDate <= new Date(recurring.endDate))) {
          // Create transaction
          await storage.createTransaction({
            organizationId: recurring.organizationId,
            date: nextDate,
            description: recurring.description,
            amount: recurring.amount,
            type: recurring.type,
            categoryId: recurring.categoryId,
            createdBy: userId,
          });
          
          // Update last generated date
          await storage.updateRecurringTransactionLastGenerated(recurring.id, nextDate);
          generatedCount.count++;
        }
      }

      res.json({ 
        message: `Generated ${generatedCount.count} transaction(s)`,
        count: generatedCount.count
      });
    } catch (error) {
      console.error("Error generating transactions:", error);
      res.status(500).json({ message: "Failed to generate transactions" });
    }
  });

  // Transaction Attachment routes
  app.get('/api/transactions/:transactionId/attachments', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const transactionId = parseInt(req.params.transactionId);
      
      // Get the transaction to check organization access
      const transaction = await storage.getTransaction(transactionId);
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      
      // Check user has access
      const userRole = await storage.getUserRole(userId, transaction.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      const attachments = await storage.getTransactionAttachments(transactionId);
      res.json(attachments);
    } catch (error) {
      console.error("Error fetching attachments:", error);
      res.status(500).json({ message: "Failed to fetch attachments" });
    }
  });

  app.post('/api/transactions/:transactionId/attachments/upload-url', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const transactionId = parseInt(req.params.transactionId);
      
      // Get the transaction to check organization access
      const transaction = await storage.getTransaction(transactionId);
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      
      // Check user has access and permission to edit transactions
      const userRole = await storage.getUserRole(userId, transaction.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }
      
      if (!hasPermission(userRole.role, userRole.permissions, 'edit_transactions')) {
        return res.status(403).json({ message: "You don't have permission to upload attachments" });
      }

      const { ObjectStorageService } = await import('./objectStorage');
      const objectStorageService = new ObjectStorageService();
      const uploadUrl = await objectStorageService.getObjectEntityUploadURL();
      
      res.json({ uploadUrl });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ message: "Failed to get upload URL" });
    }
  });

  app.post('/api/transactions/:transactionId/attachments', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const transactionId = parseInt(req.params.transactionId);
      const { fileName, fileSize, fileType, objectPath } = req.body;
      
      // Get the transaction to check organization access
      const transaction = await storage.getTransaction(transactionId);
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      
      // Check user has access and permission to edit transactions
      const userRole = await storage.getUserRole(userId, transaction.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }
      
      if (!hasPermission(userRole.role, userRole.permissions, 'edit_transactions')) {
        return res.status(403).json({ message: "You don't have permission to upload attachments" });
      }

      // Set ACL policy for the object
      const { ObjectStorageService, ObjectAccessGroupType, ObjectPermission } = await import('./objectStorage');
      const objectStorageService = new ObjectStorageService();
      
      const normalizedPath = await objectStorageService.trySetObjectEntityAclPolicy(objectPath, {
        owner: userId,
        visibility: 'private',
        aclRules: [
          {
            group: {
              type: ObjectAccessGroupType.ORGANIZATION_MEMBER,
              id: String(transaction.organizationId),
            },
            permission: ObjectPermission.READ,
          },
        ],
      });

      // Save attachment metadata
      const attachment = await storage.createTransactionAttachment({
        transactionId,
        organizationId: transaction.organizationId,
        fileName,
        fileSize,
        fileType,
        objectPath: normalizedPath,
        uploadedBy: userId,
      });
      
      res.status(201).json(attachment);
    } catch (error) {
      console.error("Error saving attachment:", error);
      res.status(500).json({ message: "Failed to save attachment" });
    }
  });

  app.get('/api/attachments/:id/download', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const attachmentId = parseInt(req.params.id);
      
      // Get attachment from database
      const attachment = await storage.getTransactionAttachment(attachmentId);
      
      if (!attachment) {
        return res.status(404).json({ message: "Attachment not found" });
      }
      
      // Check user has access to the organization
      const userRole = await storage.getUserRole(userId, attachment.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Get the object file and check ACL
      const { ObjectStorageService, ObjectPermission } = await import('./objectStorage');
      const objectStorageService = new ObjectStorageService();
      const objectFile = await objectStorageService.getObjectEntityFile(attachment.objectPath);
      
      const canAccess = await objectStorageService.canAccessObjectEntity({
        userId,
        objectFile,
        requestedPermission: ObjectPermission.READ,
      });
      
      if (!canAccess) {
        return res.status(403).json({ message: "Access denied to this file" });
      }

      // Download the file
      await objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error downloading attachment:", error);
      if (!res.headersSent) {
        res.status(500).json({ message: "Failed to download attachment" });
      }
    }
  });

  app.delete('/api/attachments/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const attachmentId = parseInt(req.params.id);
      
      // Get attachment from database
      const attachment = await storage.getTransactionAttachment(attachmentId);
      
      if (!attachment) {
        return res.status(404).json({ message: "Attachment not found" });
      }
      
      // Check user has access and permission
      const userRole = await storage.getUserRole(userId, attachment.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      if (!hasPermission(userRole.role, userRole.permissions, 'edit_transactions')) {
        return res.status(403).json({ message: "You don't have permission to delete attachments" });
      }

      // Delete from object storage
      const { ObjectStorageService } = await import('./objectStorage');
      const objectStorageService = new ObjectStorageService();
      const objectFile = await objectStorageService.getObjectEntityFile(attachment.objectPath);
      await objectFile.delete();

      // Delete from database
      await storage.deleteTransactionAttachment(attachmentId);
      
      res.status(200).json({ message: "Attachment deleted successfully" });
    } catch (error) {
      console.error("Error deleting attachment:", error);
      res.status(500).json({ message: "Failed to delete attachment" });
    }
  });

  // AI Categorization routes
  app.post('/api/ai/suggest-category/:organizationId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);
      const { description, amount, type } = req.body;

      // Check user has access to this organization
      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      // Check rate limit
      if (!checkAiRateLimit(userId, organizationId)) {
        return res.status(429).json({ message: "Too many AI requests. Please try again in a minute." });
      }

      // Validate inputs
      if (!description || !amount || !type) {
        return res.status(400).json({ message: "Missing required fields: description, amount, type" });
      }

      if (type !== 'income' && type !== 'expense') {
        return res.status(400).json({ message: "Type must be 'income' or 'expense'" });
      }

      // Validate amount is a valid number
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount < 0) {
        return res.status(400).json({ message: "Amount must be a valid positive number" });
      }

      const suggestion = await suggestCategory(
        organizationId,
        description,
        parsedAmount,
        type
      );

      if (!suggestion) {
        return res.status(404).json({ message: "No suitable category found" });
      }

      // Record the suggestion in categorization history with 'pending' status
      const historyRecord = await storage.recordCategorizationSuggestion({
        organizationId,
        transactionId: null, // No transaction ID for preview suggestions
        userId,
        transactionDescription: description,
        transactionAmount: parsedAmount.toString(),
        transactionType: type,
        suggestedCategoryId: suggestion.categoryId,
        suggestedCategoryName: suggestion.categoryName,
        confidence: suggestion.confidence,
        reasoning: suggestion.reasoning,
        userDecision: 'pending',
        finalCategoryId: null,
      });

      res.json({ ...suggestion, historyId: historyRecord.id });
    } catch (error) {
      console.error("Error suggesting category:", error);
      res.status(500).json({ message: "Failed to suggest category" });
    }
  });

  app.post('/api/ai/suggest-categories-bulk/:organizationId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);
      const { transactions } = req.body;

      // Check user has access to this organization
      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      // Check rate limit (bulk counts as 1 request regardless of batch size)
      if (!checkAiRateLimit(userId, organizationId)) {
        return res.status(429).json({ message: "Too many AI requests. Please try again in a minute." });
      }

      if (!Array.isArray(transactions) || transactions.length === 0) {
        return res.status(400).json({ message: "Transactions array is required" });
      }

      // Limit bulk requests to avoid long processing times and abuse
      if (transactions.length > 50) {
        return res.status(400).json({ message: "Maximum 50 transactions allowed per bulk request" });
      }

      // Validate each transaction has required fields and valid amounts
      for (const tx of transactions) {
        if (!tx.description || !tx.amount || !tx.type) {
          return res.status(400).json({ message: "Each transaction must have description, amount, and type" });
        }
        const parsedAmount = parseFloat(tx.amount);
        if (isNaN(parsedAmount) || parsedAmount < 0) {
          return res.status(400).json({ message: "All amounts must be valid positive numbers" });
        }
      }

      const suggestions = await suggestCategoryBulk(organizationId, transactions);
      
      console.log(`[Bulk Categorization] Organization ${organizationId} - Received ${suggestions.size} suggestions for ${transactions.length} transactions`);

      // Record suggestions in categorization history and attach historyId to each
      const suggestionsWithHistory = new Map<number, any>();
      
      for (const [transactionId, suggestion] of suggestions.entries()) {
        const tx = transactions.find((t: any) => t.id === transactionId);
        if (tx && suggestion) {
          const historyRecord = await storage.recordCategorizationSuggestion({
            organizationId,
            transactionId,
            userId,
            transactionDescription: tx.description,
            transactionAmount: tx.amount.toString(),
            transactionType: tx.type,
            suggestedCategoryId: suggestion.categoryId,
            suggestedCategoryName: suggestion.categoryName,
            confidence: suggestion.confidence,
            reasoning: suggestion.reasoning,
            userDecision: 'pending',
            finalCategoryId: null,
          });
          
          suggestionsWithHistory.set(transactionId, {
            ...suggestion,
            historyId: historyRecord.id,
          });
        }
      }

      // Convert Map to object for JSON response
      const suggestionsObj: Record<number, any> = {};
      suggestionsWithHistory.forEach((value, key) => {
        suggestionsObj[key] = value;
      });

      res.json(suggestionsObj);
    } catch (error) {
      console.error("Error suggesting categories in bulk:", error);
      res.status(500).json({ message: "Failed to suggest categories" });
    }
  });

  // Record user feedback on AI categorization suggestions
  app.post('/api/ai/categorization-feedback', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { historyId, userDecision, finalCategoryId } = req.body;

      if (!historyId || !userDecision) {
        return res.status(400).json({ message: "historyId and userDecision are required" });
      }

      if (!['accepted', 'rejected', 'modified'].includes(userDecision)) {
        return res.status(400).json({ message: "userDecision must be 'accepted', 'rejected', or 'modified'" });
      }

      if (userDecision === 'modified' && !finalCategoryId) {
        return res.status(400).json({ message: "finalCategoryId is required when userDecision is 'modified'" });
      }

      await storage.updateCategorizationDecision(historyId, userDecision, finalCategoryId);
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error recording categorization feedback:", error);
      res.status(500).json({ message: "Failed to record feedback" });
    }
  });

  // Grant routes
  app.get('/api/grants/:organizationId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);
      
      // Check user has access to this organization
      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      const grants = await storage.getGrants(organizationId);
      res.json(grants);
    } catch (error) {
      console.error("Error fetching grants:", error);
      res.status(500).json({ message: "Failed to fetch grants" });
    }
  });

  app.post('/api/grants', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const data = insertGrantSchema.parse(req.body);
      
      // Check user has access to this organization and has owner/admin role
      const userRole = await storage.getUserRole(userId, data.organizationId);
      if (!userRole || (userRole.role !== 'owner' && userRole.role !== 'admin')) {
        return res.status(403).json({ message: "Access denied - only owners and admins can manage grants" });
      }

      const grant = await storage.createGrant(data);
      await storage.logCreate(data.organizationId, userId, 'grant', grant.id.toString(), grant);
      res.status(201).json(grant);
    } catch (error) {
      console.error("Error creating grant:", error);
      res.status(400).json({ message: "Failed to create grant" });
    }
  });

  app.patch('/api/grants/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const grantId = parseInt(req.params.id);
      const updates = req.body;

      const existing = await storage.getGrant(grantId);
      if (!existing) {
        return res.status(404).json({ message: "Grant not found" });
      }

      const userRole = await storage.getUserRole(userId, existing.organizationId);
      if (!userRole || (userRole.role !== 'owner' && userRole.role !== 'admin')) {
        return res.status(403).json({ message: "Access denied - only owners and admins can manage grants" });
      }

      const updated = await storage.updateGrant(grantId, updates);
      await storage.logUpdate(existing.organizationId, userId, 'grant', grantId.toString(), existing, updated);
      res.json(updated);
    } catch (error) {
      console.error("Error updating grant:", error);
      res.status(500).json({ message: "Failed to update grant" });
    }
  });

  app.delete('/api/grants/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const grantId = parseInt(req.params.id);

      const existing = await storage.getGrant(grantId);
      if (!existing) {
        return res.status(404).json({ message: "Grant not found" });
      }

      const userRole = await storage.getUserRole(userId, existing.organizationId);
      if (!userRole || (userRole.role !== 'owner' && userRole.role !== 'admin')) {
        return res.status(403).json({ message: "Access denied - only owners and admins can delete grants" });
      }

      await storage.deleteGrant(grantId);
      await storage.logDelete(existing.organizationId, userId, 'grant', grantId.toString(), existing);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting grant:", error);
      res.status(500).json({ message: "Failed to delete grant" });
    }
  });

  // Budget routes
  app.get('/api/budgets/:organizationId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);
      
      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      const budgets = await storage.getBudgets(organizationId);
      res.json(budgets);
    } catch (error) {
      console.error("Error fetching budgets:", error);
      res.status(500).json({ message: "Failed to fetch budgets" });
    }
  });

  app.get('/api/budgets/:budgetId/items', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const budgetId = parseInt(req.params.budgetId);
      
      const budget = await storage.getBudget(budgetId);
      if (!budget) {
        return res.status(404).json({ message: "Budget not found" });
      }

      const userRole = await storage.getUserRole(userId, budget.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      const items = await storage.getBudgetItems(budgetId);
      res.json(items);
    } catch (error) {
      console.error("Error fetching budget items:", error);
      res.status(500).json({ message: "Failed to fetch budget items" });
    }
  });

  app.get('/api/budgets/:budgetId/vs-actual', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const budgetId = parseInt(req.params.budgetId);
      
      const budget = await storage.getBudget(budgetId);
      if (!budget) {
        return res.status(404).json({ message: "Budget not found" });
      }

      const userRole = await storage.getUserRole(userId, budget.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      const comparison = await storage.getBudgetVsActual(budgetId);
      res.json(comparison);
    } catch (error) {
      console.error("Error fetching budget vs actual:", error);
      res.status(500).json({ message: "Failed to fetch budget vs actual" });
    }
  });

  app.post('/api/budgets', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const data = insertBudgetSchema.parse({ ...req.body, createdBy: userId });
      
      const userRole = await storage.getUserRole(userId, data.organizationId);
      if (!userRole || (userRole.role !== 'owner' && userRole.role !== 'admin' && userRole.role !== 'accountant')) {
        return res.status(403).json({ message: "Access denied - only owners, admins, and accountants can manage budgets" });
      }

      const budget = await storage.createBudget(data);
      res.status(201).json(budget);
    } catch (error) {
      console.error("Error creating budget:", error);
      res.status(400).json({ message: "Failed to create budget" });
    }
  });

  app.patch('/api/budgets/:budgetId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const budgetId = parseInt(req.params.budgetId);
      
      const budget = await storage.getBudget(budgetId);
      if (!budget) {
        return res.status(404).json({ message: "Budget not found" });
      }

      const userRole = await storage.getUserRole(userId, budget.organizationId);
      if (!userRole || (userRole.role !== 'owner' && userRole.role !== 'admin' && userRole.role !== 'accountant')) {
        return res.status(403).json({ message: "Access denied - only owners, admins, and accountants can manage budgets" });
      }

      const updated = await storage.updateBudget(budgetId, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Error updating budget:", error);
      res.status(400).json({ message: "Failed to update budget" });
    }
  });

  app.delete('/api/budgets/:budgetId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const budgetId = parseInt(req.params.budgetId);
      
      const budget = await storage.getBudget(budgetId);
      if (!budget) {
        return res.status(404).json({ message: "Budget not found" });
      }

      const userRole = await storage.getUserRole(userId, budget.organizationId);
      if (!userRole || (userRole.role !== 'owner' && userRole.role !== 'admin')) {
        return res.status(403).json({ message: "Access denied - only owners and admins can delete budgets" });
      }

      await storage.deleteBudget(budgetId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting budget:", error);
      res.status(500).json({ message: "Failed to delete budget" });
    }
  });

  app.post('/api/budgets/:budgetId/items', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const budgetId = parseInt(req.params.budgetId);
      const data = insertBudgetItemSchema.parse({ ...req.body, budgetId });
      
      const budget = await storage.getBudget(budgetId);
      if (!budget) {
        return res.status(404).json({ message: "Budget not found" });
      }

      const userRole = await storage.getUserRole(userId, budget.organizationId);
      if (!userRole || (userRole.role !== 'owner' && userRole.role !== 'admin' && userRole.role !== 'accountant')) {
        return res.status(403).json({ message: "Access denied - only owners, admins, and accountants can manage budget items" });
      }

      const item = await storage.createBudgetItem(data);
      res.status(201).json(item);
    } catch (error) {
      console.error("Error creating budget item:", error);
      res.status(400).json({ message: "Failed to create budget item" });
    }
  });

  app.patch('/api/budget-items/:itemId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const itemId = parseInt(req.params.itemId);
      
      const [item] = await storage.getBudgetItems(req.body.budgetId);
      if (!item) {
        return res.status(404).json({ message: "Budget item not found" });
      }

      const budget = await storage.getBudget(item.budgetId);
      if (!budget) {
        return res.status(404).json({ message: "Budget not found" });
      }

      const userRole = await storage.getUserRole(userId, budget.organizationId);
      if (!userRole || (userRole.role !== 'owner' && userRole.role !== 'admin' && userRole.role !== 'accountant')) {
        return res.status(403).json({ message: "Access denied - only owners, admins, and accountants can manage budget items" });
      }

      const updated = await storage.updateBudgetItem(itemId, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Error updating budget item:", error);
      res.status(400).json({ message: "Failed to update budget item" });
    }
  });

  app.delete('/api/budget-items/:itemId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const itemId = parseInt(req.params.itemId);
      
      await storage.deleteBudgetItem(itemId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting budget item:", error);
      res.status(500).json({ message: "Failed to delete budget item" });
    }
  });

  // Dashboard routes
  app.get('/api/dashboard/:organizationId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);
      
      // Check user has access to this organization
      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      const stats = await storage.getDashboardStats(organizationId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  app.get('/api/dashboard/:organizationId/monthly-trends', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);
      const months = parseInt(req.query.months as string) || 6;
      
      // Check user has access to this organization
      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      const trends = await storage.getMonthlyTrends(organizationId, months);
      res.json(trends);
    } catch (error) {
      console.error("Error fetching monthly trends:", error);
      res.status(500).json({ message: "Failed to fetch monthly trends" });
    }
  });

  app.get('/api/dashboard/:organizationId/category-breakdown', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);
      
      // Check user has access to this organization
      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      // Get current month's category breakdown
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      const report = await storage.getProfitLossReport(organizationId, startOfMonth, endOfMonth);
      res.json({
        incomeByCategory: report.incomeByCategory,
        expensesByCategory: report.expensesByCategory,
      });
    } catch (error) {
      console.error("Error fetching category breakdown:", error);
      res.status(500).json({ message: "Failed to fetch category breakdown" });
    }
  });

  // Enhanced Analytics routes
  app.get('/api/analytics/:organizationId/year-over-year', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);
      
      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      if (!hasPermission(userRole.role, userRole.permissions, 'make_reports')) {
        return res.status(403).json({ message: "You don't have permission to view analytics" });
      }

      const analytics = await storage.getYearOverYearAnalytics(organizationId);
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching year-over-year analytics:", error);
      res.status(500).json({ message: "Failed to fetch year-over-year analytics" });
    }
  });

  app.get('/api/analytics/:organizationId/forecast', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);
      const months = parseInt(req.query.months as string) || 6;
      
      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      if (!hasPermission(userRole.role, userRole.permissions, 'make_reports')) {
        return res.status(403).json({ message: "You don't have permission to view analytics" });
      }

      const forecast = await storage.getForecastAnalytics(organizationId, months);
      res.json(forecast);
    } catch (error) {
      console.error("Error generating forecast:", error);
      res.status(500).json({ message: "Failed to generate forecast" });
    }
  });

  app.get('/api/analytics/:organizationId/financial-health', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);
      
      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      if (!hasPermission(userRole.role, userRole.permissions, 'make_reports')) {
        return res.status(403).json({ message: "You don't have permission to view analytics" });
      }

      const health = await storage.getFinancialHealthMetrics(organizationId);
      res.json(health);
    } catch (error) {
      console.error("Error fetching financial health:", error);
      res.status(500).json({ message: "Failed to fetch financial health metrics" });
    }
  });

  app.get('/api/analytics/:organizationId/spending-insights', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);
      
      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      if (!hasPermission(userRole.role, userRole.permissions, 'make_reports')) {
        return res.status(403).json({ message: "You don't have permission to view analytics" });
      }

      const insights = await storage.getSpendingInsights(organizationId);
      res.json(insights);
    } catch (error) {
      console.error("Error fetching spending insights:", error);
      res.status(500).json({ message: "Failed to fetch spending insights" });
    }
  });

  // Compliance routes
  app.get('/api/compliance/:organizationId/metrics', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);
      
      // Check user has access to this organization
      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      const metrics = await storage.getComplianceMetrics(organizationId);
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching compliance metrics:", error);
      res.status(500).json({ message: "Failed to fetch compliance metrics" });
    }
  });

  app.get('/api/compliance/:organizationId/grants', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);
      
      // Check user has access to this organization
      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      const grantCompliance = await storage.getGrantCompliance(organizationId);
      res.json(grantCompliance);
    } catch (error) {
      console.error("Error fetching grant compliance:", error);
      res.status(500).json({ message: "Failed to fetch grant compliance" });
    }
  });

  // Report routes
  app.get('/api/reports/profit-loss/:organizationId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);
      const startDate = new Date(req.query.startDate as string);
      const endDate = new Date(req.query.endDate as string);
      
      // Check user has access and permission to make reports
      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }
      
      if (!hasPermission(userRole.role, userRole.permissions, 'make_reports')) {
        return res.status(403).json({ message: "You don't have permission to generate reports" });
      }

      const report = await storage.getProfitLossReport(organizationId, startDate, endDate);
      res.json(report);
    } catch (error) {
      console.error("Error generating profit/loss report:", error);
      res.status(500).json({ message: "Failed to generate report" });
    }
  });

  app.get('/api/reports/balance-sheet/:organizationId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);
      const asOfDate = new Date(req.query.asOfDate as string);
      
      // Check user has access and permission to make reports
      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }
      
      if (!hasPermission(userRole.role, userRole.permissions, 'make_reports')) {
        return res.status(403).json({ message: "You don't have permission to generate reports" });
      }

      // Use cached version for better performance
      const report = await getBalanceSheetCached(organizationId, asOfDate);
      res.json(report);
    } catch (error) {
      console.error("Error fetching balance sheet report:", error);
      res.status(500).json({ message: "Failed to fetch balance sheet report" });
    }
  });

  app.get('/api/reports/transactions/:organizationId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);
      const startDate = new Date(req.query.startDate as string);
      const endDate = new Date(req.query.endDate as string);
      
      // Check user has access and permission to make reports
      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }
      
      if (!hasPermission(userRole.role, userRole.permissions, 'make_reports')) {
        return res.status(403).json({ message: "You don't have permission to generate reports" });
      }

      const transactions = await storage.getTransactionsByDateRange(organizationId, startDate, endDate);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching transaction history:", error);
      res.status(500).json({ message: "Failed to fetch transaction history" });
    }
  });

  // Plaid routes
  app.post('/api/plaid/create-link-token/:organizationId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);

      // Check user has access to this organization
      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole || !['owner', 'admin'].includes(userRole.role)) {
        return res.status(403).json({ message: "Only owners and admins can connect bank accounts" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const response = await plaidClient.linkTokenCreate({
        user: {
          client_user_id: userId,
        },
        client_name: 'Budget Manager',
        products: ['transactions' as any],
        country_codes: ['US' as any],
        language: 'en',
      });

      res.json({ link_token: response.data.link_token });
    } catch (error) {
      console.error("Error creating link token:", error);
      res.status(500).json({ message: "Failed to create link token" });
    }
  });

  app.post('/api/plaid/exchange-token/:organizationId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);
      const { public_token } = req.body;

      // Check user has access to this organization
      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole || !['owner', 'admin'].includes(userRole.role)) {
        return res.status(403).json({ message: "Only owners and admins can connect bank accounts" });
      }

      // Exchange public token for access token
      const tokenResponse = await plaidClient.itemPublicTokenExchange({
        public_token,
      });

      const accessToken = tokenResponse.data.access_token;
      const itemId = tokenResponse.data.item_id;

      // Get institution info
      const itemResponse = await plaidClient.itemGet({
        access_token: accessToken,
      });

      const institutionId = itemResponse.data.item.institution_id || null;
      let institutionName = null;

      if (institutionId) {
        try {
          const instResponse = await plaidClient.institutionsGetById({
            institution_id: institutionId,
            country_codes: ['US' as any],
          });
          institutionName = instResponse.data.institution.name;
        } catch (error) {
          console.error("Error fetching institution name:", error);
        }
      }

      // Store the Plaid item
      const plaidItem = await storage.createPlaidItem({
        organizationId,
        itemId,
        accessToken,
        institutionId,
        institutionName,
        createdBy: userId,
      });

      // Get accounts
      const accountsResponse = await plaidClient.accountsGet({
        access_token: accessToken,
      });

      // Store accounts
      for (const account of accountsResponse.data.accounts) {
        await storage.createPlaidAccount({
          plaidItemId: plaidItem.id,
          accountId: account.account_id,
          name: account.name,
          officialName: account.official_name || null,
          mask: account.mask || null,
          type: account.type,
          subtype: account.subtype || null,
          currentBalance: account.balances.current?.toString() || null,
          availableBalance: account.balances.available?.toString() || null,
          isoCurrencyCode: account.balances.iso_currency_code || null,
        });
      }

      res.json({ success: true, accounts: accountsResponse.data.accounts.length });
    } catch (error) {
      console.error("Error exchanging token:", error);
      res.status(500).json({ message: "Failed to connect bank account" });
    }
  });

  app.get('/api/plaid/accounts/:organizationId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);

      // Check user has access to this organization
      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      const accounts = await storage.getAllPlaidAccounts(organizationId);
      res.json(accounts);
    } catch (error) {
      console.error("Error fetching Plaid accounts:", error);
      res.status(500).json({ message: "Failed to fetch bank accounts" });
    }
  });

  app.delete('/api/plaid/item/:itemId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const itemId = req.params.itemId;

      // Get the Plaid item to check organization
      const plaidItem = await storage.getPlaidItem(itemId);
      if (!plaidItem) {
        return res.status(404).json({ message: "Bank connection not found" });
      }

      // Check user has access to this organization
      const userRole = await storage.getUserRole(userId, plaidItem.organizationId);
      if (!userRole || !['owner', 'admin'].includes(userRole.role)) {
        return res.status(403).json({ message: "Only owners and admins can disconnect bank accounts" });
      }

      // Remove the item from Plaid
      try {
        await plaidClient.itemRemove({
          access_token: plaidItem.accessToken,
        });
      } catch (error) {
        console.error("Error removing item from Plaid:", error);
      }

      // Delete from database (cascade will delete accounts)
      await storage.deletePlaidItem(plaidItem.id);

      res.json({ success: true });
    } catch (error) {
      console.error("Error disconnecting bank account:", error);
      res.status(500).json({ message: "Failed to disconnect bank account" });
    }
  });

  app.post('/api/plaid/sync-transactions/:organizationId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);

      // Check user has access to this organization
      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      // Get all plaid items for this organization
      const plaidItems = await storage.getPlaidItems(organizationId);
      if (plaidItems.length === 0) {
        return res.json({ imported: 0, message: "No bank accounts connected" });
      }

      let totalImported = 0;
      const errors = [];

      // Sync transactions for each plaid item
      for (const plaidItem of plaidItems) {
        try {
          // Get transactions from last 30 days
          const endDate = new Date();
          const startDate = new Date();
          startDate.setDate(startDate.getDate() - 30);

          const transactionsResponse = await plaidClient.transactionsGet({
            access_token: plaidItem.accessToken,
            start_date: startDate.toISOString().split('T')[0],
            end_date: endDate.toISOString().split('T')[0],
            options: {
              count: 500,
              offset: 0,
            },
          });

          // Update account balances
          for (const account of transactionsResponse.data.accounts) {
            await storage.updatePlaidAccountBalances(
              account.account_id,
              account.balances.current?.toString() || '0',
              account.balances.available?.toString() || '0'
            );
          }

          // Import transactions
          for (const plaidTx of transactionsResponse.data.transactions) {
            // Check if transaction already exists by looking for similar transactions
            // (same amount, date, and description)
            const existingTxs = await storage.getTransactionsByDateRange(
              organizationId,
              new Date(plaidTx.date),
              new Date(plaidTx.date)
            );

            const isDuplicate = existingTxs.some(tx => 
              Math.abs(parseFloat(tx.amount) - Math.abs(plaidTx.amount)) < 0.01 &&
              tx.description === plaidTx.name
            );

            if (isDuplicate) {
              continue;
            }

            // Determine transaction type (income vs expense)
            // Plaid amounts are positive for money spent, negative for money received
            const isIncome = plaidTx.amount < 0;
            const amount = Math.abs(plaidTx.amount);

            // Create transaction
            await storage.createTransaction({
              organizationId,
              date: new Date(plaidTx.date),
              description: plaidTx.name,
              amount: amount.toString(),
              type: isIncome ? 'income' : 'expense',
              categoryId: null,
              grantId: null,
              createdBy: userId,
            });

            totalImported++;
          }
        } catch (error) {
          console.error(`Error syncing transactions for item ${plaidItem.itemId}:`, error);
          errors.push({
            institution: plaidItem.institutionName || 'Unknown',
            error: 'Failed to sync transactions',
          });
        }
      }

      if (errors.length > 0) {
        return res.status(207).json({
          imported: totalImported,
          errors,
          message: `Imported ${totalImported} transactions with some errors`,
        });
      }

      res.json({
        imported: totalImported,
        message: `Successfully imported ${totalImported} new transactions`,
      });
    } catch (error) {
      console.error("Error syncing transactions:", error);
      res.status(500).json({ message: "Failed to sync transactions" });
    }
  });

  // Invoice routes
  app.get('/api/invoices/:organizationId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);
      
      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      const invoices = await storage.getInvoices(organizationId);
      res.json(invoices);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      res.status(500).json({ message: "Failed to fetch invoices" });
    }
  });

  app.get('/api/invoices/single/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const invoiceId = parseInt(req.params.id);
      
      const invoice = await storage.getInvoice(invoiceId);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      const userRole = await storage.getUserRole(userId, invoice.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      res.json(invoice);
    } catch (error) {
      console.error("Error fetching invoice:", error);
      res.status(500).json({ message: "Failed to fetch invoice" });
    }
  });

  app.post('/api/invoices', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const data = insertInvoiceSchema.parse(req.body);
      
      const userRole = await storage.getUserRole(userId, data.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }
      
      if (!hasPermission(userRole.role, userRole.permissions, 'edit_transactions')) {
        return res.status(403).json({ message: "You don't have permission to manage invoices" });
      }

      const invoice = await storage.createInvoice({ ...data, createdBy: userId });
      
      // Log audit trail
      await storage.logAuditTrail({
        organizationId: data.organizationId,
        userId,
        entityType: 'invoice',
        entityId: invoice.id.toString(),
        action: 'create',
        oldValues: null,
        newValues: invoice,
        ipAddress: req.ip || null,
        userAgent: req.get('user-agent') || null
      });
      
      res.status(201).json(invoice);
    } catch (error) {
      console.error("Error creating invoice:", error);
      res.status(400).json({ message: "Failed to create invoice" });
    }
  });

  app.patch('/api/invoices/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const invoiceId = parseInt(req.params.id);
      const updates = insertInvoiceSchema.partial().parse(req.body);

      const existingInvoice = await storage.getInvoice(invoiceId);
      if (!existingInvoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      const userRole = await storage.getUserRole(userId, existingInvoice.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }
      
      if (!hasPermission(userRole.role, userRole.permissions, 'edit_transactions')) {
        return res.status(403).json({ message: "You don't have permission to manage invoices" });
      }

      const updated = await storage.updateInvoice(invoiceId, updates);
      
      // Log audit trail
      await storage.logAuditTrail({
        organizationId: existingInvoice.organizationId,
        userId,
        entityType: 'invoice',
        entityId: invoiceId.toString(),
        action: 'update',
        oldValues: existingInvoice,
        newValues: updated,
        ipAddress: req.ip || null,
        userAgent: req.get('user-agent') || null
      });
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating invoice:", error);
      res.status(400).json({ message: "Failed to update invoice" });
    }
  });

  app.delete('/api/invoices/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const invoiceId = parseInt(req.params.id);

      const existingInvoice = await storage.getInvoice(invoiceId);
      if (!existingInvoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      const userRole = await storage.getUserRole(userId, existingInvoice.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }
      
      if (!hasPermission(userRole.role, userRole.permissions, 'edit_transactions')) {
        return res.status(403).json({ message: "You don't have permission to manage invoices" });
      }

      // Log audit trail before deletion
      await storage.logAuditTrail({
        organizationId: existingInvoice.organizationId,
        userId,
        entityType: 'invoice',
        entityId: invoiceId.toString(),
        action: 'delete',
        oldValues: existingInvoice,
        newValues: null,
        ipAddress: req.ip || null,
        userAgent: req.get('user-agent') || null
      });

      await storage.deleteInvoice(invoiceId);
      res.json({ message: "Invoice deleted successfully" });
    } catch (error) {
      console.error("Error deleting invoice:", error);
      res.status(500).json({ message: "Failed to delete invoice" });
    }
  });

  app.post('/api/invoices/:id/send-email', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const invoiceId = parseInt(req.params.id);
      const { recipientEmail } = req.body;

      if (!recipientEmail) {
        return res.status(400).json({ message: "Recipient email is required" });
      }

      const invoice = await storage.getInvoice(invoiceId);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      const userRole = await storage.getUserRole(userId, invoice.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      if (!hasPermission(userRole.role, userRole.permissions, 'edit_transactions')) {
        return res.status(403).json({ message: "You don't have permission to send invoices" });
      }

      const organization = await storage.getOrganization(invoice.organizationId);
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }

      const customer = invoice.clientId ? await storage.getClient(invoice.clientId) : null;
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }

      const lineItems = await storage.getInvoiceLineItems(invoiceId);

      const logoUrl = organization.logoUrl 
        ? `${req.protocol}://${req.get('host')}${organization.logoUrl}`
        : undefined;

      await sendInvoiceEmail({
        to: recipientEmail,
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: new Date(invoice.issueDate).toLocaleDateString(),
        dueDate: new Date(invoice.dueDate).toLocaleDateString(),
        amount: Number(invoice.totalAmount),
        customerName: customer.name,
        organizationName: organization.name,
        organizationEmail: organization.companyEmail || '',
        organizationPhone: organization.companyPhone || undefined,
        organizationAddress: organization.companyAddress || undefined,
        items: lineItems.map(item => ({
          description: item.description,
          quantity: Number(item.quantity),
          unitPrice: Number(item.rate),
          total: Number(item.amount)
        })),
        notes: invoice.notes || undefined,
        branding: {
          primaryColor: organization.invoicePrimaryColor || undefined,
          accentColor: organization.invoiceAccentColor || undefined,
          fontFamily: organization.invoiceFontFamily || undefined,
          logoUrl,
          footer: organization.invoiceFooter || undefined
        }
      });

      // Log audit trail
      await storage.logAuditTrail({
        organizationId: invoice.organizationId,
        userId,
        entityType: 'invoice',
        entityId: invoiceId.toString(),
        action: 'update',
        oldValues: null,
        newValues: { emailSentTo: recipientEmail, emailSentAt: new Date() },
        ipAddress: req.ip || null,
        userAgent: req.get('user-agent') || null
      });

      res.json({ message: "Invoice sent successfully" });
    } catch (error) {
      console.error("Error sending invoice email:", error);
      res.status(500).json({ message: "Failed to send invoice email" });
    }
  });

  app.get('/api/invoices/:invoiceId/line-items', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const invoiceId = parseInt(req.params.invoiceId);
      
      const invoice = await storage.getInvoice(invoiceId);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      const userRole = await storage.getUserRole(userId, invoice.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      const lineItems = await storage.getInvoiceLineItems(invoiceId);
      res.json(lineItems);
    } catch (error) {
      console.error("Error fetching invoice line items:", error);
      res.status(500).json({ message: "Failed to fetch line items" });
    }
  });

  app.post('/api/invoices/:invoiceId/line-items', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const invoiceId = parseInt(req.params.invoiceId);
      const data = insertInvoiceLineItemSchema.parse(req.body);
      
      const invoice = await storage.getInvoice(invoiceId);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      const userRole = await storage.getUserRole(userId, invoice.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }
      
      if (!hasPermission(userRole.role, userRole.permissions, 'edit_transactions')) {
        return res.status(403).json({ message: "You don't have permission to manage invoices" });
      }

      const lineItem = await storage.createInvoiceLineItem({ ...data, invoiceId });
      res.status(201).json(lineItem);
    } catch (error) {
      console.error("Error creating invoice line item:", error);
      res.status(400).json({ message: "Failed to create line item" });
    }
  });

  app.patch('/api/invoice-line-items/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const lineItemId = parseInt(req.params.id);
      const updates = insertInvoiceLineItemSchema.partial().parse(req.body);

      const lineItems = await storage.getInvoiceLineItems(0);
      const lineItem = lineItems.find(item => item.id === lineItemId);
      if (!lineItem) {
        return res.status(404).json({ message: "Line item not found" });
      }

      const invoice = await storage.getInvoice(lineItem.invoiceId);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      const userRole = await storage.getUserRole(userId, invoice.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }
      
      if (!hasPermission(userRole.role, userRole.permissions, 'edit_transactions')) {
        return res.status(403).json({ message: "You don't have permission to manage invoices" });
      }

      const updated = await storage.updateInvoiceLineItem(lineItemId, updates);
      res.json(updated);
    } catch (error) {
      console.error("Error updating invoice line item:", error);
      res.status(400).json({ message: "Failed to update line item" });
    }
  });

  app.delete('/api/invoice-line-items/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const lineItemId = parseInt(req.params.id);

      const lineItems = await storage.getInvoiceLineItems(0);
      const lineItem = lineItems.find(item => item.id === lineItemId);
      if (!lineItem) {
        return res.status(404).json({ message: "Line item not found" });
      }

      const invoice = await storage.getInvoice(lineItem.invoiceId);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      const userRole = await storage.getUserRole(userId, invoice.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }
      
      if (!hasPermission(userRole.role, userRole.permissions, 'edit_transactions')) {
        return res.status(403).json({ message: "You don't have permission to manage invoices" });
      }

      await storage.deleteInvoiceLineItem(lineItemId);
      res.json({ message: "Line item deleted successfully" });
    } catch (error) {
      console.error("Error deleting invoice line item:", error);
      res.status(500).json({ message: "Failed to delete line item" });
    }
  });

  // Bill routes
  app.get('/api/bills/:organizationId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);
      
      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      const bills = await storage.getBills(organizationId);
      res.json(bills);
    } catch (error) {
      console.error("Error fetching bills:", error);
      res.status(500).json({ message: "Failed to fetch bills" });
    }
  });

  app.get('/api/bills/single/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const billId = parseInt(req.params.id);
      
      const bill = await storage.getBill(billId);
      if (!bill) {
        return res.status(404).json({ message: "Bill not found" });
      }

      const userRole = await storage.getUserRole(userId, bill.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      res.json(bill);
    } catch (error) {
      console.error("Error fetching bill:", error);
      res.status(500).json({ message: "Failed to fetch bill" });
    }
  });

  app.post('/api/bills', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const data = insertBillSchema.parse(req.body);
      
      const userRole = await storage.getUserRole(userId, data.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }
      
      if (!hasPermission(userRole.role, userRole.permissions, 'edit_transactions')) {
        return res.status(403).json({ message: "You don't have permission to manage bills" });
      }

      const bill = await storage.createBill({ ...data, createdBy: userId });
      
      // Log audit trail
      await storage.logAuditTrail({
        organizationId: data.organizationId,
        userId,
        entityType: 'bill',
        entityId: bill.id.toString(),
        action: 'create',
        oldValues: null,
        newValues: bill,
        ipAddress: req.ip || null,
        userAgent: req.get('user-agent') || null
      });
      
      res.status(201).json(bill);
    } catch (error) {
      console.error("Error creating bill:", error);
      res.status(400).json({ message: "Failed to create bill" });
    }
  });

  app.patch('/api/bills/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const billId = parseInt(req.params.id);
      const updates = insertBillSchema.partial().parse(req.body);

      const existingBill = await storage.getBill(billId);
      if (!existingBill) {
        return res.status(404).json({ message: "Bill not found" });
      }

      const userRole = await storage.getUserRole(userId, existingBill.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }
      
      if (!hasPermission(userRole.role, userRole.permissions, 'edit_transactions')) {
        return res.status(403).json({ message: "You don't have permission to manage bills" });
      }

      const updated = await storage.updateBill(billId, updates);
      
      // Log audit trail
      await storage.logAuditTrail({
        organizationId: existingBill.organizationId,
        userId,
        entityType: 'bill',
        entityId: billId.toString(),
        action: 'update',
        oldValues: existingBill,
        newValues: updated,
        ipAddress: req.ip || null,
        userAgent: req.get('user-agent') || null
      });
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating bill:", error);
      res.status(400).json({ message: "Failed to update bill" });
    }
  });

  app.delete('/api/bills/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const billId = parseInt(req.params.id);

      const existingBill = await storage.getBill(billId);
      if (!existingBill) {
        return res.status(404).json({ message: "Bill not found" });
      }

      const userRole = await storage.getUserRole(userId, existingBill.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }
      
      if (!hasPermission(userRole.role, userRole.permissions, 'edit_transactions')) {
        return res.status(403).json({ message: "You don't have permission to manage bills" });
      }

      // Log audit trail before deletion
      await storage.logAuditTrail({
        organizationId: existingBill.organizationId,
        userId,
        entityType: 'bill',
        entityId: billId.toString(),
        action: 'delete',
        oldValues: existingBill,
        newValues: null,
        ipAddress: req.ip || null,
        userAgent: req.get('user-agent') || null
      });

      await storage.deleteBill(billId);
      res.json({ message: "Bill deleted successfully" });
    } catch (error) {
      console.error("Error deleting bill:", error);
      res.status(500).json({ message: "Failed to delete bill" });
    }
  });

  app.get('/api/bills/:billId/line-items', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const billId = parseInt(req.params.billId);
      
      const bill = await storage.getBill(billId);
      if (!bill) {
        return res.status(404).json({ message: "Bill not found" });
      }

      const userRole = await storage.getUserRole(userId, bill.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      const lineItems = await storage.getBillLineItems(billId);
      res.json(lineItems);
    } catch (error) {
      console.error("Error fetching bill line items:", error);
      res.status(500).json({ message: "Failed to fetch line items" });
    }
  });

  app.post('/api/bills/:billId/line-items', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const billId = parseInt(req.params.billId);
      const data = insertBillLineItemSchema.parse(req.body);
      
      const bill = await storage.getBill(billId);
      if (!bill) {
        return res.status(404).json({ message: "Bill not found" });
      }

      const userRole = await storage.getUserRole(userId, bill.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }
      
      if (!hasPermission(userRole.role, userRole.permissions, 'edit_transactions')) {
        return res.status(403).json({ message: "You don't have permission to manage bills" });
      }

      const lineItem = await storage.createBillLineItem({ ...data, billId });
      res.status(201).json(lineItem);
    } catch (error) {
      console.error("Error creating bill line item:", error);
      res.status(400).json({ message: "Failed to create line item" });
    }
  });

  app.patch('/api/bill-line-items/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const lineItemId = parseInt(req.params.id);
      const updates = insertBillLineItemSchema.partial().parse(req.body);

      const lineItems = await storage.getBillLineItems(0);
      const lineItem = lineItems.find(item => item.id === lineItemId);
      if (!lineItem) {
        return res.status(404).json({ message: "Line item not found" });
      }

      const bill = await storage.getBill(lineItem.billId);
      if (!bill) {
        return res.status(404).json({ message: "Bill not found" });
      }

      const userRole = await storage.getUserRole(userId, bill.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }
      
      if (!hasPermission(userRole.role, userRole.permissions, 'edit_transactions')) {
        return res.status(403).json({ message: "You don't have permission to manage bills" });
      }

      const updated = await storage.updateBillLineItem(lineItemId, updates);
      res.json(updated);
    } catch (error) {
      console.error("Error updating bill line item:", error);
      res.status(400).json({ message: "Failed to update line item" });
    }
  });

  app.delete('/api/bill-line-items/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const lineItemId = parseInt(req.params.id);

      const lineItems = await storage.getBillLineItems(0);
      const lineItem = lineItems.find(item => item.id === lineItemId);
      if (!lineItem) {
        return res.status(404).json({ message: "Line item not found" });
      }

      const bill = await storage.getBill(lineItem.billId);
      if (!bill) {
        return res.status(404).json({ message: "Bill not found" });
      }

      const userRole = await storage.getUserRole(userId, bill.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }
      
      if (!hasPermission(userRole.role, userRole.permissions, 'edit_transactions')) {
        return res.status(403).json({ message: "You don't have permission to manage bills" });
      }

      await storage.deleteBillLineItem(lineItemId);
      res.json({ message: "Line item deleted successfully" });
    } catch (error) {
      console.error("Error deleting bill line item:", error);
      res.status(500).json({ message: "Failed to delete line item" });
    }
  });

  // ============================================
  // EXPENSE APPROVAL ROUTES
  // ============================================

  app.get('/api/expense-approvals/:organizationId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);

      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      const approvals = await storage.getExpenseApprovals(organizationId);
      res.json(approvals);
    } catch (error) {
      console.error("Error fetching expense approvals:", error);
      res.status(500).json({ message: "Failed to fetch expense approvals" });
    }
  });

  app.post('/api/expense-approvals/:organizationId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);
      const data = insertExpenseApprovalSchema.omit({ organizationId: true, requestedBy: true }).parse(req.body);

      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      const approval = await storage.createExpenseApproval({
        ...data,
        organizationId,
        requestedBy: userId,
      });

      res.status(201).json(approval);
    } catch (error) {
      console.error("Error creating expense approval:", error);
      res.status(400).json({ message: "Failed to create expense approval" });
    }
  });

  app.patch('/api/expense-approvals/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const approvalId = parseInt(req.params.id);
      const updates = insertExpenseApprovalSchema.partial().parse(req.body);

      const approval = await storage.getExpenseApproval(approvalId);
      if (!approval) {
        return res.status(404).json({ message: "Expense approval not found" });
      }

      const userRole = await storage.getUserRole(userId, approval.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Only the requester can update a pending request
      if (approval.requestedBy !== userId && approval.status === 'pending') {
        return res.status(403).json({ message: "You can only update your own requests" });
      }

      const updated = await storage.updateExpenseApproval(approvalId, updates);
      res.json(updated);
    } catch (error) {
      console.error("Error updating expense approval:", error);
      res.status(400).json({ message: "Failed to update expense approval" });
    }
  });

  app.post('/api/expense-approvals/:id/approve', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const approvalId = parseInt(req.params.id);
      const { notes } = req.body;

      const approval = await storage.getExpenseApproval(approvalId);
      if (!approval) {
        return res.status(404).json({ message: "Expense approval not found" });
      }

      const userRole = await storage.getUserRole(userId, approval.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Only admins and owners can approve
      if (userRole.role !== 'owner' && userRole.role !== 'admin') {
        return res.status(403).json({ message: "Only admins and owners can approve expenses" });
      }

      const updated = await storage.approveExpenseApproval(approvalId, userId, notes);
      res.json(updated);
    } catch (error) {
      console.error("Error approving expense:", error);
      res.status(400).json({ message: "Failed to approve expense" });
    }
  });

  app.post('/api/expense-approvals/:id/reject', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const approvalId = parseInt(req.params.id);
      const { notes } = req.body;

      const approval = await storage.getExpenseApproval(approvalId);
      if (!approval) {
        return res.status(404).json({ message: "Expense approval not found" });
      }

      const userRole = await storage.getUserRole(userId, approval.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Only admins and owners can reject
      if (userRole.role !== 'owner' && userRole.role !== 'admin') {
        return res.status(403).json({ message: "Only admins and owners can reject expenses" });
      }

      const updated = await storage.rejectExpenseApproval(approvalId, userId, notes);
      res.json(updated);
    } catch (error) {
      console.error("Error rejecting expense:", error);
      res.status(400).json({ message: "Failed to reject expense" });
    }
  });

  app.delete('/api/expense-approvals/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const approvalId = parseInt(req.params.id);

      const approval = await storage.getExpenseApproval(approvalId);
      if (!approval) {
        return res.status(404).json({ message: "Expense approval not found" });
      }

      const userRole = await storage.getUserRole(userId, approval.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Only the requester or admin/owner can delete
      if (approval.requestedBy !== userId && userRole.role !== 'owner' && userRole.role !== 'admin') {
        return res.status(403).json({ message: "You can only delete your own requests" });
      }

      await storage.deleteExpenseApproval(approvalId);
      res.json({ message: "Expense approval deleted successfully" });
    } catch (error) {
      console.error("Error deleting expense approval:", error);
      res.status(500).json({ message: "Failed to delete expense approval" });
    }
  });

  // ============================================
  // CASH FLOW FORECASTING ROUTES
  // ============================================

  app.get('/api/cash-flow-scenarios/:organizationId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);

      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      const scenarios = await storage.getCashFlowScenarios(organizationId);
      res.json(scenarios);
    } catch (error) {
      console.error("Error fetching cash flow scenarios:", error);
      res.status(500).json({ message: "Failed to fetch scenarios" });
    }
  });

  app.post('/api/cash-flow-scenarios/:organizationId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);
      const data = insertCashFlowScenarioSchema.omit({ organizationId: true, createdBy: true }).parse(req.body);

      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      if (!hasPermission(userRole.role, userRole.permissions, 'make_reports')) {
        return res.status(403).json({ message: "You don't have permission to create forecasts" });
      }

      const scenario = await storage.createCashFlowScenario({
        ...data,
        organizationId,
        createdBy: userId,
      });

      res.status(201).json(scenario);
    } catch (error) {
      console.error("Error creating cash flow scenario:", error);
      res.status(400).json({ message: "Failed to create scenario" });
    }
  });

  app.get('/api/cash-flow-projections/:scenarioId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const scenarioId = parseInt(req.params.scenarioId);

      const scenario = await storage.getCashFlowScenario(scenarioId);
      if (!scenario) {
        return res.status(404).json({ message: "Scenario not found" });
      }

      const userRole = await storage.getUserRole(userId, scenario.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied" });
      }

      const projections = await storage.getCashFlowProjections(scenarioId);
      res.json(projections);
    } catch (error) {
      console.error("Error fetching projections:", error);
      res.status(500).json({ message: "Failed to fetch projections" });
    }
  });

  app.post('/api/cash-flow-projections/:scenarioId/generate', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const scenarioId = parseInt(req.params.scenarioId);

      const scenario = await storage.getCashFlowScenario(scenarioId);
      if (!scenario) {
        return res.status(404).json({ message: "Scenario not found" });
      }

      const userRole = await storage.getUserRole(userId, scenario.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied" });
      }

      if (!hasPermission(userRole.role, userRole.permissions, 'make_reports')) {
        return res.status(403).json({ message: "You don't have permission to generate forecasts" });
      }

      const projections = await storage.generateCashFlowProjections(scenarioId);
      res.json(projections);
    } catch (error) {
      console.error("Error generating projections:", error);
      res.status(500).json({ message: "Failed to generate projections" });
    }
  });

  app.delete('/api/cash-flow-scenarios/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const scenarioId = parseInt(req.params.id);

      const scenario = await storage.getCashFlowScenario(scenarioId);
      if (!scenario) {
        return res.status(404).json({ message: "Scenario not found" });
      }

      const userRole = await storage.getUserRole(userId, scenario.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied" });
      }

      if (!hasPermission(userRole.role, userRole.permissions, 'make_reports')) {
        return res.status(403).json({ message: "You don't have permission to delete forecasts" });
      }

      await storage.deleteCashFlowScenario(scenarioId);
      res.json({ message: "Scenario deleted successfully" });
    } catch (error) {
      console.error("Error deleting scenario:", error);
      res.status(500).json({ message: "Failed to delete scenario" });
    }
  });

  // ============================================
  // TAX REPORTING ROUTES
  // ============================================

  app.get('/api/tax-categories/:organizationId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);

      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      const categories = await storage.getTaxCategories(organizationId);
      res.json(categories);
    } catch (error) {
      console.error("Error fetching tax categories:", error);
      res.status(500).json({ message: "Failed to fetch tax categories" });
    }
  });

  app.post('/api/tax-categories/:organizationId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);
      const data: InsertTaxCategory = insertTaxCategorySchema.parse(req.body);

      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      if (userRole.role !== 'owner' && userRole.role !== 'admin') {
        return res.status(403).json({ message: "Only admins and owners can manage tax categories" });
      }

      const category = await storage.createTaxCategory({
        ...data,
        organizationId,
      });

      res.status(201).json(category);
    } catch (error) {
      console.error("Error creating tax category:", error);
      res.status(400).json({ message: "Failed to create tax category" });
    }
  });

  app.get('/api/tax-reports/:organizationId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);
      const taxYear = req.query.taxYear ? parseInt(req.query.taxYear as string) : undefined;

      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      const reports = await storage.getTaxReports(organizationId, taxYear);
      res.json(reports);
    } catch (error) {
      console.error("Error fetching tax reports:", error);
      res.status(500).json({ message: "Failed to fetch tax reports" });
    }
  });

  app.post('/api/tax-reports/:organizationId/generate', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);
      const { taxYear } = req.body;

      if (!taxYear || typeof taxYear !== 'number') {
        return res.status(400).json({ message: "Tax year is required" });
      }

      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      if (!hasPermission(userRole.role, userRole.permissions, 'make_reports')) {
        return res.status(403).json({ message: "You don't have permission to generate tax reports" });
      }

      const report = await storage.generateYearEndTaxReport(organizationId, taxYear);
      res.status(201).json(report);
    } catch (error) {
      console.error("Error generating tax report:", error);
      res.status(500).json({ message: "Failed to generate tax report" });
    }
  });

  app.get('/api/tax-form-1099s/:organizationId/:year', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);
      const taxYear = parseInt(req.params.year);

      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      const forms = await storage.getTaxForm1099s(organizationId, taxYear);
      res.json(forms);
    } catch (error) {
      console.error("Error fetching 1099 forms:", error);
      res.status(500).json({ message: "Failed to fetch 1099 forms" });
    }
  });

  app.get('/api/tax-form-1099s/:organizationId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);
      const taxYear = req.query.taxYear ? parseInt(req.query.taxYear as string) : undefined;

      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      const forms = await storage.getTaxForm1099s(organizationId, taxYear);
      res.json(forms);
    } catch (error) {
      console.error("Error fetching 1099 forms:", error);
      res.status(500).json({ message: "Failed to fetch 1099 forms" });
    }
  });

  app.post('/api/tax-form-1099s/:organizationId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);
      const data = insertTaxForm1099Schema.omit({ organizationId: true, createdBy: true }).parse(req.body);

      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      if (userRole.role !== 'owner' && userRole.role !== 'admin') {
        return res.status(403).json({ message: "Only admins and owners can manage 1099 forms" });
      }

      const form = await storage.createTaxForm1099({
        ...data,
        organizationId,
        createdBy: userId,
      });

      res.status(201).json(form);
    } catch (error) {
      console.error("Error creating 1099 form:", error);
      res.status(400).json({ message: "Failed to create 1099 form" });
    }
  });

  // ============================================
  // Custom Report Routes
  // ============================================

  // Get all custom reports for an organization
  app.get('/api/custom-reports/:organizationId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);

      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      const reports = await storage.getCustomReports(organizationId);
      res.json(reports);
    } catch (error) {
      console.error("Error fetching custom reports:", error);
      res.status(500).json({ message: "Failed to fetch custom reports" });
    }
  });

  // Get a single custom report
  app.get('/api/custom-reports/:organizationId/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);
      const reportId = parseInt(req.params.id);

      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      const report = await storage.getCustomReport(reportId);
      if (!report || report.organizationId !== organizationId) {
        return res.status(404).json({ message: "Report not found" });
      }

      res.json(report);
    } catch (error) {
      console.error("Error fetching custom report:", error);
      res.status(500).json({ message: "Failed to fetch custom report" });
    }
  });

  // Create a new custom report
  app.post('/api/custom-reports/:organizationId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);
      const data = insertCustomReportSchema.omit({ organizationId: true, createdBy: true }).parse(req.body);

      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      // Check if user has permission to create reports
      if (!hasPermission(userRole.role, userRole.permissions, 'make_reports')) {
        return res.status(403).json({ message: "You don't have permission to create reports" });
      }

      const report = await storage.createCustomReport({
        ...data,
        organizationId,
        createdBy: userId,
      });

      res.status(201).json(report);
    } catch (error) {
      console.error("Error creating custom report:", error);
      res.status(400).json({ message: "Failed to create custom report" });
    }
  });

  // Update a custom report
  app.patch('/api/custom-reports/:organizationId/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);
      const reportId = parseInt(req.params.id);
      const updates = req.body;

      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      // Check if user has permission to edit reports
      if (!hasPermission(userRole.role, userRole.permissions, 'make_reports')) {
        return res.status(403).json({ message: "You don't have permission to edit reports" });
      }

      const existingReport = await storage.getCustomReport(reportId);
      if (!existingReport || existingReport.organizationId !== organizationId) {
        return res.status(404).json({ message: "Report not found" });
      }

      const report = await storage.updateCustomReport(reportId, updates);
      res.json(report);
    } catch (error) {
      console.error("Error updating custom report:", error);
      res.status(400).json({ message: "Failed to update custom report" });
    }
  });

  // Delete a custom report
  app.delete('/api/custom-reports/:organizationId/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);
      const reportId = parseInt(req.params.id);

      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      // Check if user has permission to delete reports
      if (!hasPermission(userRole.role, userRole.permissions, 'make_reports')) {
        return res.status(403).json({ message: "You don't have permission to delete reports" });
      }

      const existingReport = await storage.getCustomReport(reportId);
      if (!existingReport || existingReport.organizationId !== organizationId) {
        return res.status(404).json({ message: "Report not found" });
      }

      await storage.deleteCustomReport(reportId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting custom report:", error);
      res.status(500).json({ message: "Failed to delete custom report" });
    }
  });

  // Execute a custom report (run the query and get results)
  app.post('/api/custom-reports/:organizationId/:id/execute', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);
      const reportId = parseInt(req.params.id);
      const { dateFrom, dateTo } = req.body;

      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      const existingReport = await storage.getCustomReport(reportId);
      if (!existingReport || existingReport.organizationId !== organizationId) {
        return res.status(404).json({ message: "Report not found" });
      }

      const results = await storage.executeCustomReport(reportId, dateFrom, dateTo);
      res.json(results);
    } catch (error) {
      console.error("Error executing custom report:", error);
      res.status(500).json({ message: "Failed to execute custom report" });
    }
  });

  // Export custom report results as CSV
  app.post('/api/custom-reports/:organizationId/:id/export', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);
      const reportId = parseInt(req.params.id);
      const { dateFrom, dateTo } = req.body;

      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      const existingReport = await storage.getCustomReport(reportId);
      if (!existingReport || existingReport.organizationId !== organizationId) {
        return res.status(404).json({ message: "Report not found" });
      }

      const results = await storage.executeCustomReport(reportId, dateFrom, dateTo);
      
      // Convert results to CSV
      if (results.length === 0) {
        return res.status(404).json({ message: "No data to export" });
      }

      // Get organization for branding
      const organization = await storage.getOrganization(organizationId);
      
      // Build branded CSV header rows
      const brandedHeaders: string[] = [];
      const orgName = organization?.companyName || organization?.name || 'Organization';
      brandedHeaders.push(`"${orgName}"`);
      brandedHeaders.push(`"${existingReport.name}"`);
      
      if (dateFrom && dateTo) {
        brandedHeaders.push(`"Period: ${new Date(dateFrom).toLocaleDateString()} - ${new Date(dateTo).toLocaleDateString()}"`);
      } else if (dateTo) {
        brandedHeaders.push(`"As of: ${new Date(dateTo).toLocaleDateString()}"`);
      } else if (dateFrom) {
        brandedHeaders.push(`"From: ${new Date(dateFrom).toLocaleDateString()}"`);
      }
      
      brandedHeaders.push(`"Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}"`);
      
      if (organization?.invoiceFooter) {
        brandedHeaders.push(`"${organization.invoiceFooter.replace(/"/g, '""')}"`);
      }
      
      brandedHeaders.push(''); // Empty line for separation

      const headers = Object.keys(results[0]);
      const csvRows = [
        ...brandedHeaders,
        headers.join(','),
        ...results.map(row => 
          headers.map(header => {
            const value = (row as any)[header];
            if (value === null || value === undefined) return '';
            // Escape values that contain commas, quotes, or newlines
            const stringValue = String(value);
            if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
              return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
          }).join(',')
        )
      ];

      const csv = csvRows.join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${existingReport.name}-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csv);
    } catch (error) {
      console.error("Error exporting custom report:", error);
      res.status(500).json({ message: "Failed to export custom report" });
    }
  });

  // Audit log routes
  app.get('/api/audit-logs/:organizationId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);
      
      // Check user has access to this organization and is admin/owner
      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }
      
      // Only admin and owner can view audit logs
      if (userRole.role !== 'admin' && userRole.role !== 'owner') {
        return res.status(403).json({ message: "You don't have permission to view audit logs" });
      }
      
      // Parse query parameters for filtering
      const { entityType, entityId, userId: filterUserId, action, startDate, endDate, limit } = req.query;
      
      const filters: any = {};
      if (entityType) filters.entityType = entityType as string;
      if (entityId) filters.entityId = entityId as string;
      if (filterUserId) filters.userId = filterUserId as string;
      if (action) filters.action = action as string;
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);
      if (limit) filters.limit = parseInt(limit as string);
      
      const auditLogs = await storage.getAuditLogs(organizationId, filters);
      res.json(auditLogs);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      res.status(500).json({ message: "Failed to fetch audit logs" });
    }
  });

  // Security monitoring routes (NIST 800-53 AU-6, SI-4)
  app.get('/api/security/metrics/:organizationId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);
      
      // Check user has access to this organization and is admin/owner
      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }
      
      // Only admin and owner can view security metrics
      if (userRole.role !== 'admin' && userRole.role !== 'owner') {
        return res.status(403).json({ message: "You don't have permission to view security metrics" });
      }
      
      // Get security events from last 24 hours for this organization
      const startDate = new Date();
      startDate.setHours(startDate.getHours() - 24);
      
      const allEvents = await storage.getSecurityEvents({
        organizationId,
        startDate,
        limit: 1000,
      });
      
      // Calculate metrics
      const totalEvents = allEvents.length;
      const criticalEvents = allEvents.filter(e => e.severity === 'critical').length;
      const warningEvents = allEvents.filter(e => e.severity === 'warning').length;
      const loginFailures = allEvents.filter(e => e.eventType === 'login_failure').length;
      const unauthorizedAccess = allEvents.filter(e => e.eventType === 'unauthorized_access').length;
      const permissionDenials = allEvents.filter(e => e.eventType === 'permission_denied').length;
      const accountLockouts = allEvents.filter(e => e.eventType === 'account_locked').length;
      
      // Get recent events (last 50)
      const recentEvents = allEvents.slice(0, 50);
      
      // Events by type
      const eventTypeCount = new Map<string, number>();
      allEvents.forEach(e => {
        const count = eventTypeCount.get(e.eventType) || 0;
        eventTypeCount.set(e.eventType, count + 1);
      });
      const eventsByType = Array.from(eventTypeCount.entries()).map(([eventType, count]) => ({
        eventType: eventType.replace(/_/g, ' '),
        count,
      }));
      
      // Events by hour
      const eventsByHour = new Array(24).fill(0).map((_, i) => {
        const hour = new Date();
        hour.setHours(hour.getHours() - (23 - i), 0, 0, 0);
        const hourEnd = new Date(hour);
        hourEnd.setHours(hourEnd.getHours() + 1);
        
        const count = allEvents.filter(e => {
          const eventTime = new Date(e.timestamp);
          return eventTime >= hour && eventTime < hourEnd;
        }).length;
        
        return {
          hour: hour.getHours().toString().padStart(2, '0') + ':00',
          count,
        };
      });
      
      // Verify audit log chain integrity
      const auditChainStatus = await storage.verifyAuditLogChain(organizationId);
      
      res.json({
        totalEvents,
        criticalEvents,
        warningEvents,
        loginFailures,
        unauthorizedAccess,
        permissionDenials,
        accountLockouts,
        recentEvents,
        eventsByType,
        eventsByHour,
        auditChainStatus,
      });
    } catch (error) {
      console.error("Error fetching security metrics:", error);
      res.status(500).json({ message: "Failed to fetch security metrics" });
    }
  });

  // Vulnerability scanning routes (NIST 800-53 RA-5, SI-2)
  // Trigger manual vulnerability scan (admin/owner only)
  app.post('/api/security/vulnerability-scan', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // For global security operations, we need to verify the user is at least an admin in one organization
      const organizations = await storage.getOrganizations(userId);
      const isAdminOrOwner = organizations.some(org => org.userRole === 'admin' || org.userRole === 'owner');
      
      if (!isAdminOrOwner) {
        return res.status(403).json({ message: "You don't have permission to run vulnerability scans" });
      }
      
      // Start scan asynchronously (don't wait for completion)
      runVulnerabilityScan(storage).catch(err => {
        console.error("Vulnerability scan failed:", err);
      });
      
      res.json({ message: "Vulnerability scan started" });
    } catch (error) {
      console.error("Error starting vulnerability scan:", error);
      res.status(500).json({ message: "Failed to start vulnerability scan" });
    }
  });

  // Get latest vulnerability scan results
  app.get('/api/security/vulnerability-scan/latest', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // For global security operations, we need to verify the user is at least an admin in one organization
      const organizations = await storage.getOrganizations(userId);
      const isAdminOrOwner = organizations.some(org => org.userRole === 'admin' || org.userRole === 'owner');
      
      if (!isAdminOrOwner) {
        return res.status(403).json({ message: "You don't have permission to view vulnerability scans" });
      }
      
      const latest = await storage.getLatestVulnerabilityScan();
      res.json(latest || null);
    } catch (error) {
      console.error("Error fetching latest vulnerability scan:", error);
      res.status(500).json({ message: "Failed to fetch latest vulnerability scan" });
    }
  });

  // Get vulnerability scan summary
  app.get('/api/security/vulnerability-scan/summary', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // For global security operations, we need to verify the user is at least an admin in one organization
      const organizations = await storage.getOrganizations(userId);
      const isAdminOrOwner = organizations.some(org => org.userRole === 'admin' || org.userRole === 'owner');
      
      if (!isAdminOrOwner) {
        return res.status(403).json({ message: "You don't have permission to view vulnerability scans" });
      }
      
      const summary = await getLatestVulnerabilitySummary(storage);
      res.json(summary);
    } catch (error) {
      console.error("Error fetching vulnerability scan summary:", error);
      res.status(500).json({ message: "Failed to fetch vulnerability scan summary" });
    }
  });

  // Get vulnerability scan history
  app.get('/api/security/vulnerability-scan/history', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // For global security operations, we need to verify the user is at least an admin in one organization
      const organizations = await storage.getOrganizations(userId);
      const isAdminOrOwner = organizations.some(org => org.userRole === 'admin' || org.userRole === 'owner');
      
      if (!isAdminOrOwner) {
        return res.status(403).json({ message: "You don't have permission to view vulnerability scans" });
      }
      
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const history = await storage.getVulnerabilityScans(limit);
      res.json(history);
    } catch (error) {
      console.error("Error fetching vulnerability scan history:", error);
      res.status(500).json({ message: "Failed to fetch vulnerability scan history" });
    }
  });

  // MFA enforcement endpoints (NIST 800-53 IA-2(1), IA-2(2))
  app.get('/api/security/mfa/status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const gracePeriodCheck = await storage.checkMfaGracePeriod(userId);
      
      res.json({
        mfaRequired: user.mfaRequired,
        mfaGracePeriodEnd: user.mfaGracePeriodEnd,
        gracePeriodExpired: gracePeriodCheck.expired,
        daysRemaining: gracePeriodCheck.daysRemaining,
      });
    } catch (error) {
      console.error("Error fetching MFA status:", error);
      res.status(500).json({ message: "Failed to fetch MFA status" });
    }
  });

  app.post('/api/security/mfa/set-required', isAuthenticated, async (req: any, res) => {
    try {
      const currentUserId = req.user.claims.sub;
      const { userId, required, gracePeriodDays } = req.body;
      
      // Only owners/admins can set MFA requirements
      const organizations = await storage.getOrganizations(currentUserId);
      const isAdminOrOwner = organizations.some(org => org.userRole === 'admin' || org.userRole === 'owner');
      
      if (!isAdminOrOwner) {
        return res.status(403).json({ message: "Only owners and admins can set MFA requirements" });
      }
      
      const updatedUser = await storage.setMfaRequired(userId, required, gracePeriodDays || 30);
      
      // Log security event
      await storage.logSecurityEvent({
        eventType: 'permission_denied',
        severity: 'low',
        userId: userId,
        email: updatedUser.email,
        ipAddress: req.ip || req.socket.remoteAddress || null,
        userAgent: req.get('user-agent') || null,
        eventData: {
          action: 'mfa_requirement_updated',
          updatedBy: currentUserId,
          required: required,
          gracePeriodDays: gracePeriodDays || 30,
        },
      });
      
      res.json({ success: true, user: updatedUser });
    } catch (error) {
      console.error("Error setting MFA requirement:", error);
      res.status(500).json({ message: "Failed to set MFA requirement" });
    }
  });

  // Notification routes
  app.get('/api/notifications/:organizationId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);
      
      // Check user has access to this organization
      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }
      
      // Parse query parameters
      const { isRead, limit } = req.query;
      const filters: any = {};
      if (isRead !== undefined) filters.isRead = isRead === 'true';
      if (limit) filters.limit = parseInt(limit as string);
      
      const notifications = await storage.getNotifications(userId, organizationId, filters);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.get('/api/notifications/:organizationId/unread-count', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);
      
      // Check user has access to this organization
      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }
      
      const count = await storage.getUnreadNotificationCount(userId, organizationId);
      res.json({ count });
    } catch (error) {
      console.error("Error fetching unread count:", error);
      res.status(500).json({ message: "Failed to fetch unread count" });
    }
  });

  app.patch('/api/notifications/:id/read', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const notificationId = parseInt(req.params.id);
      
      // Get notification and verify ownership
      const notification = await storage.getNotification(notificationId);
      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }
      
      if (notification.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      await storage.markNotificationAsRead(notificationId);
      res.json({ message: "Notification marked as read" });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  app.patch('/api/notifications/mark-all-read/:organizationId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);
      
      // Check user has access to this organization
      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }
      
      await storage.markAllNotificationsAsRead(userId, organizationId);
      res.json({ message: "All notifications marked as read" });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({ message: "Failed to mark all notifications as read" });
    }
  });

  app.delete('/api/notifications/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const notificationId = parseInt(req.params.id);
      
      // Get notification and verify ownership
      const notification = await storage.getNotification(notificationId);
      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }
      
      if (notification.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      await storage.deleteNotification(notificationId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting notification:", error);
      res.status(500).json({ message: "Failed to delete notification" });
    }
  });

  app.post('/api/notifications', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const data = req.body;
      
      // Check user has access to the organization
      const userRole = await storage.getUserRole(userId, data.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }
      
      const notification = await storage.createNotification(data);
      res.status(201).json(notification);
    } catch (error) {
      console.error("Error creating notification:", error);
      res.status(400).json({ message: "Failed to create notification" });
    }
  });

  // ============================================
  // NONPROFIT-SPECIFIC ROUTES
  // ============================================

  // Fund routes
  app.get("/api/funds/:organizationId", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);

      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "You don't have access to this organization" });
      }

      const funds = await storage.getFunds(organizationId);
      res.json(funds);
    } catch (error) {
      console.error("Error fetching funds:", error);
      res.status(500).json({ message: "Failed to fetch funds" });
    }
  });

  app.post("/api/funds", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const { organizationId, ...fundData } = req.body;
      if (!organizationId) {
        return res.status(400).json({ message: "No organization selected" });
      }

      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "You don't have access to this organization" });
      }

      if (userRole.role !== 'admin' && userRole.role !== 'owner') {
        return res.status(403).json({ message: "Only admins and owners can create funds" });
      }

      const validatedData = insertFundSchema.parse({
        ...fundData,
        organizationId,
      });

      const fund = await storage.createFund(validatedData);
      await storage.logCreate(organizationId, userId, 'fund', fund.id.toString(), fund);
      res.status(201).json(fund);
    } catch (error: any) {
      console.error("Error creating fund:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid fund data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create fund" });
    }
  });

  app.put("/api/funds/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const fund = await storage.getFund(parseInt(id));

      if (!fund) {
        return res.status(404).json({ message: "Fund not found" });
      }

      const organizationId = req.session?.organizationId;
      if (fund.organizationId !== organizationId) {
        return res.status(403).json({ message: "You don't have access to this fund" });
      }

      const userRole = await storage.getUserRole(req.user!.id, organizationId);
      if (userRole.role !== 'admin' && userRole.role !== 'owner') {
        return res.status(403).json({ message: "Only admins and owners can update funds" });
      }

      const updatedFund = await storage.updateFund(parseInt(id), req.body);
      await storage.logUpdate(organizationId, req.user!.id, 'fund', id, fund, updatedFund);
      res.json(updatedFund);
    } catch (error) {
      console.error("Error updating fund:", error);
      res.status(500).json({ message: "Failed to update fund" });
    }
  });

  app.delete("/api/funds/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const fund = await storage.getFund(parseInt(id));

      if (!fund) {
        return res.status(404).json({ message: "Fund not found" });
      }

      const organizationId = req.session?.organizationId;
      if (fund.organizationId !== organizationId) {
        return res.status(403).json({ message: "You don't have access to this fund" });
      }

      const userRole = await storage.getUserRole(req.user!.id, organizationId);
      if (userRole.role !== 'admin' && userRole.role !== 'owner') {
        return res.status(403).json({ message: "Only admins and owners can delete funds" });
      }

      await storage.deleteFund(parseInt(id));
      await storage.logDelete(organizationId, req.user!.id, 'fund', id, fund);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting fund:", error);
      res.status(500).json({ message: "Failed to delete fund" });
    }
  });

  app.get("/api/funds/:id/transactions", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const fund = await storage.getFund(parseInt(id));

      if (!fund) {
        return res.status(404).json({ message: "Fund not found" });
      }

      const organizationId = req.session?.organizationId;
      if (fund.organizationId !== organizationId) {
        return res.status(403).json({ message: "You don't have access to this fund" });
      }

      const transactions = await storage.getFundTransactions(parseInt(id));
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching fund transactions:", error);
      res.status(500).json({ message: "Failed to fetch fund transactions" });
    }
  });

  // Program routes
  app.get("/api/programs/:organizationId", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);

      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "You don't have access to this organization" });
      }

      const programs = await storage.getPrograms(organizationId);
      res.json(programs);
    } catch (error) {
      console.error("Error fetching programs:", error);
      res.status(500).json({ message: "Failed to fetch programs" });
    }
  });

  app.post("/api/programs", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const { organizationId, ...programData } = req.body;
      if (!organizationId) {
        return res.status(400).json({ message: "No organization selected" });
      }

      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "You don't have access to this organization" });
      }

      if (userRole.role !== 'admin' && userRole.role !== 'owner') {
        return res.status(403).json({ message: "Only admins and owners can create programs" });
      }

      const validatedData = insertProgramSchema.parse({
        ...programData,
        organizationId,
      });

      const program = await storage.createProgram(validatedData);
      await storage.logCreate(organizationId, userId, 'program', program.id.toString(), program);
      res.status(201).json(program);
    } catch (error: any) {
      console.error("Error creating program:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid program data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create program" });
    }
  });

  app.put("/api/programs/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const program = await storage.getProgram(parseInt(id));

      if (!program) {
        return res.status(404).json({ message: "Program not found" });
      }

      const organizationId = req.session?.organizationId;
      if (program.organizationId !== organizationId) {
        return res.status(403).json({ message: "You don't have access to this program" });
      }

      const userRole = await storage.getUserRole(req.user!.id, organizationId);
      if (userRole.role !== 'admin' && userRole.role !== 'owner') {
        return res.status(403).json({ message: "Only admins and owners can update programs" });
      }

      const updatedProgram = await storage.updateProgram(parseInt(id), req.body);
      await storage.logUpdate(organizationId, req.user!.id, 'program', id, program, updatedProgram);
      res.json(updatedProgram);
    } catch (error) {
      console.error("Error updating program:", error);
      res.status(500).json({ message: "Failed to update program" });
    }
  });

  app.delete("/api/programs/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const program = await storage.getProgram(parseInt(id));

      if (!program) {
        return res.status(404).json({ message: "Program not found" });
      }

      const organizationId = req.session?.organizationId;
      if (program.organizationId !== organizationId) {
        return res.status(403).json({ message: "You don't have access to this program" });
      }

      const userRole = await storage.getUserRole(req.user!.id, organizationId);
      if (userRole.role !== 'admin' && userRole.role !== 'owner') {
        return res.status(403).json({ message: "Only admins and owners can delete programs" });
      }

      await storage.deleteProgram(parseInt(id));
      await storage.logDelete(organizationId, req.user!.id, 'program', id, program);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting program:", error);
      res.status(500).json({ message: "Failed to delete program" });
    }
  });

  app.get("/api/programs/:id/expenses", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { startDate, endDate } = req.query;
      const program = await storage.getProgram(parseInt(id));

      if (!program) {
        return res.status(404).json({ message: "Program not found" });
      }

      const organizationId = req.session?.organizationId;
      if (program.organizationId !== organizationId) {
        return res.status(403).json({ message: "You don't have access to this program" });
      }

      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;

      const expenses = await storage.getProgramExpenses(parseInt(id), start, end);
      res.json(expenses);
    } catch (error) {
      console.error("Error fetching program expenses:", error);
      res.status(500).json({ message: "Failed to fetch program expenses" });
    }
  });

  // Pledge routes
  app.get("/api/pledges/:organizationId", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);

      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "You don't have access to this organization" });
      }

      const pledges = await storage.getPledges(organizationId);
      res.json(pledges);
    } catch (error) {
      console.error("Error fetching pledges:", error);
      res.status(500).json({ message: "Failed to fetch pledges" });
    }
  });

  app.get("/api/pledges/overdue", async (req: Request, res: Response) => {
    try {
      const organizationId = req.session?.organizationId;
      if (!organizationId) {
        return res.status(400).json({ message: "No organization selected" });
      }

      const userRole = await storage.getUserRole(req.user!.id, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "You don't have access to this organization" });
      }

      const overduePledges = await storage.getOverduePledges(organizationId);
      res.json(overduePledges);
    } catch (error) {
      console.error("Error fetching overdue pledges:", error);
      res.status(500).json({ message: "Failed to fetch overdue pledges" });
    }
  });

  app.post("/api/pledges", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const { organizationId, ...pledgeData } = req.body;
      if (!organizationId) {
        return res.status(400).json({ message: "No organization selected" });
      }

      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "You don't have access to this organization" });
      }

      if (userRole.role === 'viewer') {
        return res.status(403).json({ message: "Viewers cannot create pledges" });
      }

      const validatedData = insertPledgeSchema.parse({
        ...pledgeData,
        organizationId,
      });

      const pledge = await storage.createPledge(validatedData);
      await storage.logCreate(organizationId, userId, 'pledge', pledge.id.toString(), pledge);
      res.status(201).json(pledge);
    } catch (error: any) {
      console.error("Error creating pledge:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid pledge data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create pledge" });
    }
  });

  app.put("/api/pledges/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const pledge = await storage.getPledge(parseInt(id));

      if (!pledge) {
        return res.status(404).json({ message: "Pledge not found" });
      }

      const organizationId = req.session?.organizationId;
      if (pledge.organizationId !== organizationId) {
        return res.status(403).json({ message: "You don't have access to this pledge" });
      }

      const userRole = await storage.getUserRole(req.user!.id, organizationId);
      if (userRole.role === 'viewer') {
        return res.status(403).json({ message: "Viewers cannot update pledges" });
      }

      const updatedPledge = await storage.updatePledge(parseInt(id), req.body);
      await storage.logUpdate(organizationId, req.user!.id, 'pledge', id, pledge, updatedPledge);
      res.json(updatedPledge);
    } catch (error) {
      console.error("Error updating pledge:", error);
      res.status(500).json({ message: "Failed to update pledge" });
    }
  });

  app.delete("/api/pledges/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const pledge = await storage.getPledge(parseInt(id));

      if (!pledge) {
        return res.status(404).json({ message: "Pledge not found" });
      }

      const organizationId = req.session?.organizationId;
      if (pledge.organizationId !== organizationId) {
        return res.status(403).json({ message: "You don't have access to this pledge" });
      }

      const userRole = await storage.getUserRole(req.user!.id, organizationId);
      if (userRole.role !== 'admin' && userRole.role !== 'owner') {
        return res.status(403).json({ message: "Only admins and owners can delete pledges" });
      }

      await storage.deletePledge(parseInt(id));
      await storage.logDelete(organizationId, req.user!.id, 'pledge', id, pledge);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting pledge:", error);
      res.status(500).json({ message: "Failed to delete pledge" });
    }
  });

  app.post("/api/pledges/:id/payments", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const pledge = await storage.getPledge(parseInt(id));

      if (!pledge) {
        return res.status(404).json({ message: "Pledge not found" });
      }

      const organizationId = req.session?.organizationId;
      if (pledge.organizationId !== organizationId) {
        return res.status(403).json({ message: "You don't have access to this pledge" });
      }

      const userRole = await storage.getUserRole(req.user!.id, organizationId);
      if (userRole.role === 'viewer') {
        return res.status(403).json({ message: "Viewers cannot record pledge payments" });
      }

      const validatedData = insertPledgePaymentSchema.parse({
        ...req.body,
        pledgeId: parseInt(id),
      });

      const result = await storage.recordPledgePayment(parseInt(id), validatedData);
      await storage.logCreate(organizationId, req.user!.id, 'pledge_payment', result.payment.id.toString(), result.payment);
      res.status(201).json(result);
    } catch (error: any) {
      console.error("Error recording pledge payment:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid payment data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to record pledge payment" });
    }
  });

  app.get("/api/pledges/:id/payments", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const pledge = await storage.getPledge(parseInt(id));

      if (!pledge) {
        return res.status(404).json({ message: "Pledge not found" });
      }

      const organizationId = req.session?.organizationId;
      if (pledge.organizationId !== organizationId) {
        return res.status(403).json({ message: "You don't have access to this pledge" });
      }

      const payments = await storage.getPledgePayments(parseInt(id));
      res.json(payments);
    } catch (error) {
      console.error("Error fetching pledge payments:", error);
      res.status(500).json({ message: "Failed to fetch pledge payments" });
    }
  });

  app.delete("/api/pledge-payments/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const payment = await storage.getPledgePayment(parseInt(id));

      if (!payment) {
        return res.status(404).json({ message: "Payment not found" });
      }

      const pledge = await storage.getPledge(payment.pledgeId);
      if (!pledge) {
        return res.status(404).json({ message: "Associated pledge not found" });
      }

      const organizationId = req.session?.organizationId;
      if (pledge.organizationId !== organizationId) {
        return res.status(403).json({ message: "You don't have access to this payment" });
      }

      const userRole = await storage.getUserRole(req.user!.id, organizationId);
      if (userRole.role !== 'admin' && userRole.role !== 'owner') {
        return res.status(403).json({ message: "Only admins and owners can delete payments" });
      }

      await storage.deletePledgePayment(parseInt(id));
      await storage.logDelete(organizationId, req.user!.id, 'pledge_payment', id, payment);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting pledge payment:", error);
      res.status(500).json({ message: "Failed to delete pledge payment" });
    }
  });

  // Enhanced grant routes
  app.get("/api/grants/upcoming-deadlines", async (req: Request, res: Response) => {
    try {
      const organizationId = req.session?.organizationId;
      if (!organizationId) {
        return res.status(400).json({ message: "No organization selected" });
      }

      const userRole = await storage.getUserRole(req.user!.id, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "You don't have access to this organization" });
      }

      const daysAhead = parseInt(req.query.days as string) || 30;
      const grants = await storage.getGrantsWithUpcomingDeadlines(organizationId, daysAhead);
      res.json(grants);
    } catch (error) {
      console.error("Error fetching grants with upcoming deadlines:", error);
      res.status(500).json({ message: "Failed to fetch grants" });
    }
  });

  app.put("/api/grants/:id/compliance", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;

      if (!['compliant', 'at_risk', 'non_compliant', 'pending_review'].includes(status)) {
        return res.status(400).json({ message: "Invalid compliance status" });
      }

      const grant = await storage.getGrant(parseInt(id));
      if (!grant) {
        return res.status(404).json({ message: "Grant not found" });
      }

      const organizationId = req.session?.organizationId;
      if (grant.organizationId !== organizationId) {
        return res.status(403).json({ message: "You don't have access to this grant" });
      }

      const userRole = await storage.getUserRole(req.user!.id, organizationId);
      if (userRole.role === 'viewer') {
        return res.status(403).json({ message: "Viewers cannot update grant compliance" });
      }

      const updatedGrant = await storage.updateGrantCompliance(parseInt(id), status, notes);
      await storage.logUpdate(organizationId, req.user!.id, 'grant', id, grant, updatedGrant);
      res.json(updatedGrant);
    } catch (error) {
      console.error("Error updating grant compliance:", error);
      res.status(500).json({ message: "Failed to update grant compliance" });
    }
  });

  // Functional expense report routes
  app.get("/api/reports/functional-expenses", async (req: Request, res: Response) => {
    try {
      const organizationId = req.session?.organizationId;
      if (!organizationId) {
        return res.status(400).json({ message: "No organization selected" });
      }

      const userRole = await storage.getUserRole(req.user!.id, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "You don't have access to this organization" });
      }

      const { startDate, endDate } = req.query;
      if (!startDate || !endDate) {
        return res.status(400).json({ message: "Start date and end date are required" });
      }

      const start = new Date(startDate as string);
      const end = new Date(endDate as string);

      const report = await storage.getFunctionalExpenseReport(organizationId, start, end);
      res.json(report);
    } catch (error) {
      console.error("Error generating functional expense report:", error);
      res.status(500).json({ message: "Failed to generate functional expense report" });
    }
  });

  // Form 990 report routes
  app.get("/api/reports/form-990", async (req: Request, res: Response) => {
    try {
      const organizationId = req.session?.organizationId;
      if (!organizationId) {
        return res.status(400).json({ message: "No organization selected" });
      }

      const userRole = await storage.getUserRole(req.user!.id, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "You don't have access to this organization" });
      }

      const { taxYear } = req.query;
      if (!taxYear) {
        return res.status(400).json({ message: "Tax year is required" });
      }

      const year = parseInt(taxYear as string);
      const report = await storage.getForm990Data(organizationId, year);
      res.json(report);
    } catch (error) {
      console.error("Error generating Form 990 report:", error);
      res.status(500).json({ message: "Failed to generate Form 990 report" });
    }
  });

  // ===================================================================
  // GOVERNMENT CONTRACTS ROUTES (For-Profit)
  // ===================================================================

  // Contract routes
  app.get("/api/contracts/:organizationId", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);

      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "You don't have access to this organization" });
      }

      const contracts = await storage.getContracts(organizationId);
      res.json(contracts);
    } catch (error) {
      console.error("Error fetching contracts:", error);
      res.status(500).json({ message: "Failed to fetch contracts" });
    }
  });

  app.post("/api/contracts", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const { organizationId, ...contractData } = req.body;
      if (!organizationId) {
        return res.status(400).json({ message: "No organization selected" });
      }

      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole || userRole.role === 'viewer') {
        return res.status(403).json({ message: "You don't have permission to create contracts" });
      }

      const validatedData = insertContractSchema.parse({
        ...contractData,
        organizationId,
        createdBy: userId,
      });

      const contract = await storage.createContract(validatedData);
      await storage.logCreate(organizationId, userId, 'contract', contract.id.toString(), contract);
      res.status(201).json(contract);
    } catch (error: any) {
      console.error("Error creating contract:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid contract data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create contract" });
    }
  });

  app.put("/api/contracts/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const contractId = parseInt(req.params.id);
      
      const contract = await storage.getContract(contractId);
      if (!contract) {
        return res.status(404).json({ message: "Contract not found" });
      }

      const userRole = await storage.getUserRole(userId, contract.organizationId);
      if (!userRole || userRole.role === 'viewer') {
        return res.status(403).json({ message: "You don't have permission to update contracts" });
      }

      const { updateContractSchema } = await import("@shared/schema");
      const validatedData = updateContractSchema.parse(req.body);

      const oldData = JSON.stringify(contract);
      const updated = await storage.updateContract(contractId, validatedData);
      await storage.logUpdate(contract.organizationId, userId, 'contract', contractId.toString(), oldData, updated);
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating contract:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid contract data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update contract" });
    }
  });

  app.delete("/api/contracts/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const contractId = parseInt(req.params.id);
      
      const contract = await storage.getContract(contractId);
      if (!contract) {
        return res.status(404).json({ message: "Contract not found" });
      }

      const userRole = await storage.getUserRole(userId, contract.organizationId);
      if (!userRole || userRole.role === 'viewer') {
        return res.status(403).json({ message: "You don't have permission to delete contracts" });
      }

      await storage.logDelete(contract.organizationId, userId, 'contract', contractId.toString(), contract);
      await storage.deleteContract(contractId);
      res.json({ message: "Contract deleted successfully" });
    } catch (error) {
      console.error("Error deleting contract:", error);
      res.status(500).json({ message: "Failed to delete contract" });
    }
  });

  // Contract milestone routes
  app.get("/api/contracts/:contractId/milestones", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const contractId = parseInt(req.params.contractId);
      
      const contract = await storage.getContract(contractId);
      if (!contract) {
        return res.status(404).json({ message: "Contract not found" });
      }

      const userRole = await storage.getUserRole(userId, contract.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "You don't have access to this organization" });
      }

      const milestones = await storage.getContractMilestones(contractId);
      res.json(milestones);
    } catch (error) {
      console.error("Error fetching milestones:", error);
      res.status(500).json({ message: "Failed to fetch milestones" });
    }
  });

  app.post("/api/milestones", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const { organizationId, contractId, ...milestoneData } = req.body;
      
      if (!organizationId || !contractId) {
        return res.status(400).json({ message: "Organization and contract are required" });
      }

      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole || userRole.role === 'viewer') {
        return res.status(403).json({ message: "You don't have permission to create milestones" });
      }

      const validatedData = insertContractMilestoneSchema.parse({
        ...milestoneData,
        organizationId,
        contractId,
        createdBy: userId,
      });

      const milestone = await storage.createContractMilestone(validatedData);
      await storage.logCreate(organizationId, userId, 'milestone', milestone.id.toString(), milestone);
      res.status(201).json(milestone);
    } catch (error: any) {
      console.error("Error creating milestone:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid milestone data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create milestone" });
    }
  });

  app.put("/api/milestones/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const milestoneId = parseInt(req.params.id);
      
      const milestone = await storage.getContractMilestone(milestoneId);
      if (!milestone) {
        return res.status(404).json({ message: "Milestone not found" });
      }

      const userRole = await storage.getUserRole(userId, milestone.organizationId);
      if (!userRole || userRole.role === 'viewer') {
        return res.status(403).json({ message: "You don't have permission to update milestones" });
      }

      const oldData = JSON.stringify(milestone);
      const updated = await storage.updateContractMilestone(milestoneId, req.body);
      await storage.logUpdate(milestone.organizationId, userId, 'milestone', milestoneId.toString(), oldData, updated);
      res.json(updated);
    } catch (error) {
      console.error("Error updating milestone:", error);
      res.status(500).json({ message: "Failed to update milestone" });
    }
  });

  app.delete("/api/milestones/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const milestoneId = parseInt(req.params.id);
      
      const milestone = await storage.getContractMilestone(milestoneId);
      if (!milestone) {
        return res.status(404).json({ message: "Milestone not found" });
      }

      const userRole = await storage.getUserRole(userId, milestone.organizationId);
      if (!userRole || userRole.role === 'viewer') {
        return res.status(403).json({ message: "You don't have permission to delete milestones" });
      }

      await storage.logDelete(milestone.organizationId, userId, 'milestone', milestoneId.toString(), milestone);
      await storage.deleteContractMilestone(milestoneId);
      res.json({ message: "Milestone deleted successfully" });
    } catch (error) {
      console.error("Error deleting milestone:", error);
      res.status(500).json({ message: "Failed to delete milestone" });
    }
  });

  // Project (Job Costing) routes
  app.get("/api/projects/:organizationId", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);

      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "You don't have access to this organization" });
      }

      const projects = await storage.getProjects(organizationId);
      res.json(projects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.post("/api/projects", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const { organizationId, ...projectData } = req.body;
      
      if (!organizationId) {
        return res.status(400).json({ message: "No organization selected" });
      }

      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole || userRole.role === 'viewer') {
        return res.status(403).json({ message: "You don't have permission to create projects" });
      }

      // Clean up empty strings to null for optional fields and coerce numeric fields
      const cleanedData = {
        ...projectData,
        organizationId,
        createdBy: userId,
        contractId: projectData.contractId === '' ? null : projectData.contractId,
        endDate: projectData.endDate === '' ? null : projectData.endDate,
        budget: projectData.budget === '' || projectData.budget == null ? null : Number(projectData.budget),
        projectManager: projectData.projectManager === '' ? null : projectData.projectManager,
        projectType: projectData.projectType === '' ? null : projectData.projectType,
        billingMethod: projectData.billingMethod === '' ? null : projectData.billingMethod,
        laborRate: projectData.laborRate === '' || projectData.laborRate == null ? null : Number(projectData.laborRate),
        overheadRate: projectData.overheadRate === '' || projectData.overheadRate == null ? null : Number(projectData.overheadRate),
        notes: projectData.notes === '' ? null : projectData.notes,
      };

      const validatedData = insertProjectSchema.parse(cleanedData);

      const project = await storage.createProject(validatedData);
      await storage.logCreate(organizationId, userId, 'project', project.id.toString(), project);
      res.status(201).json(project);
    } catch (error: any) {
      console.error("Error creating project:", error);
      console.error("Request body:", req.body);
      if (error.name === "ZodError") {
        console.error("Zod validation errors:", JSON.stringify(error.errors, null, 2));
        return res.status(400).json({ message: "Invalid project data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create project", error: error.message });
    }
  });

  app.put("/api/projects/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const projectId = parseInt(req.params.id);
      
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const userRole = await storage.getUserRole(userId, project.organizationId);
      if (!userRole || userRole.role === 'viewer') {
        return res.status(403).json({ message: "You don't have permission to update projects" });
      }

      const oldData = JSON.stringify(project);
      const updated = await storage.updateProject(projectId, req.body);
      await storage.logUpdate(project.organizationId, userId, 'project', projectId.toString(), oldData, updated);
      res.json(updated);
    } catch (error) {
      console.error("Error updating project:", error);
      res.status(500).json({ message: "Failed to update project" });
    }
  });

  app.delete("/api/projects/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const projectId = parseInt(req.params.id);
      
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const userRole = await storage.getUserRole(userId, project.organizationId);
      if (!userRole || userRole.role === 'viewer') {
        return res.status(403).json({ message: "You don't have permission to delete projects" });
      }

      await storage.logDelete(project.organizationId, userId, 'project', projectId.toString(), project);
      await storage.deleteProject(projectId);
      res.json({ message: "Project deleted successfully" });
    } catch (error) {
      console.error("Error deleting project:", error);
      res.status(500).json({ message: "Failed to delete project" });
    }
  });

  app.post("/api/projects/:id/clone", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const sourceProjectId = parseInt(req.params.id);
      const { projectNumber, projectName, copyCosts, copyMilestones } = req.body;
      
      const sourceProject = await storage.getProject(sourceProjectId);
      if (!sourceProject) {
        return res.status(404).json({ message: "Source project not found" });
      }

      const userRole = await storage.getUserRole(userId, sourceProject.organizationId);
      if (!userRole || userRole.role === 'viewer') {
        return res.status(403).json({ message: "You don't have permission to clone projects" });
      }

      const newProjectData = {
        organizationId: sourceProject.organizationId,
        contractId: sourceProject.contractId,
        projectNumber: projectNumber || `${sourceProject.projectNumber}-CLONE`,
        projectName: projectName || `${sourceProject.projectName} (Copy)`,
        description: sourceProject.description,
        startDate: new Date(),
        endDate: sourceProject.endDate,
        budget: sourceProject.budget,
        projectManager: sourceProject.projectManager,
        projectType: sourceProject.projectType,
        billingMethod: sourceProject.billingMethod,
        laborRate: sourceProject.laborRate,
        overheadRate: sourceProject.overheadRate,
        status: 'active',
        notes: `Cloned from project #${sourceProject.id} (${sourceProject.projectNumber})`,
        clonedFromId: sourceProject.id,
        createdBy: userId,
      };

      const validatedData = insertProjectSchema.parse(newProjectData);
      const newProject = await storage.createProject(validatedData);

      if (copyCosts) {
        const sourceCosts = await storage.getProjectCosts(sourceProjectId);
        for (const cost of sourceCosts) {
          const newCost = {
            organizationId: cost.organizationId,
            projectId: newProject.id,
            costDate: new Date(),
            costType: cost.costType,
            description: cost.description,
            amount: cost.amount,
            quantity: cost.quantity,
            unitCost: cost.unitCost,
            vendorName: cost.vendorName,
            invoiceNumber: null,
            notes: `Cloned from project #${sourceProject.id}`,
            createdBy: userId,
          };
          await storage.createProjectCost(newCost);
        }
      }

      await storage.logCreate(sourceProject.organizationId, userId, 'project', newProject.id.toString(), newProject);
      res.status(201).json(newProject);
    } catch (error: any) {
      console.error("Error cloning project:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid project data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to clone project" });
    }
  });

  app.post("/api/projects/validate-number", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const { organizationId, projectNumber, excludeProjectId } = req.body;
      
      if (!organizationId || !projectNumber) {
        return res.status(400).json({ message: "Organization ID and project number are required" });
      }

      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "You don't have access to this organization" });
      }

      const projects = await storage.getProjects(organizationId);
      const exists = projects.some(p => 
        p.projectNumber === projectNumber && 
        (!excludeProjectId || p.id !== excludeProjectId)
      );
      
      res.json({ exists, available: !exists });
    } catch (error) {
      console.error("Error validating project number:", error);
      res.status(500).json({ message: "Failed to validate project number" });
    }
  });

  // Project cost routes
  app.get("/api/projects/:projectId/costs", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const projectId = parseInt(req.params.projectId);
      
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const userRole = await storage.getUserRole(userId, project.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "You don't have access to this organization" });
      }

      const costs = await storage.getProjectCosts(projectId);
      res.json(costs);
    } catch (error) {
      console.error("Error fetching project costs:", error);
      res.status(500).json({ message: "Failed to fetch project costs" });
    }
  });

  app.post("/api/project-costs", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const { organizationId, projectId, ...costData } = req.body;
      
      if (!organizationId || !projectId) {
        return res.status(400).json({ message: "Organization and project are required" });
      }

      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole || userRole.role === 'viewer') {
        return res.status(403).json({ message: "You don't have permission to create project costs" });
      }

      const validatedData = insertProjectCostSchema.parse({
        ...costData,
        organizationId,
        projectId,
        createdBy: userId,
      });

      const cost = await storage.createProjectCost(validatedData);
      await storage.logCreate(organizationId, userId, 'project_cost', cost.id.toString(), cost);
      res.status(201).json(cost);
    } catch (error: any) {
      console.error("Error creating project cost:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid cost data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create project cost" });
    }
  });

  app.put("/api/project-costs/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const costId = parseInt(req.params.id);
      
      const cost = await storage.getProjectCost(costId);
      if (!cost) {
        return res.status(404).json({ message: "Project cost not found" });
      }

      const userRole = await storage.getUserRole(userId, cost.organizationId);
      if (!userRole || userRole.role === 'viewer') {
        return res.status(403).json({ message: "You don't have permission to update project costs" });
      }

      const oldData = JSON.stringify(cost);
      const updated = await storage.updateProjectCost(costId, req.body);
      await storage.logUpdate(cost.organizationId, userId, 'project_cost', costId.toString(), oldData, updated);
      res.json(updated);
    } catch (error) {
      console.error("Error updating project cost:", error);
      res.status(500).json({ message: "Failed to update project cost" });
    }
  });

  app.delete("/api/project-costs/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const costId = parseInt(req.params.id);
      
      const cost = await storage.getProjectCost(costId);
      if (!cost) {
        return res.status(404).json({ message: "Project cost not found" });
      }

      const userRole = await storage.getUserRole(userId, cost.organizationId);
      if (!userRole || userRole.role === 'viewer') {
        return res.status(403).json({ message: "You don't have permission to delete project costs" });
      }

      await storage.logDelete(cost.organizationId, userId, 'project_cost', costId.toString(), cost);
      await storage.deleteProjectCost(costId);
      res.json({ message: "Project cost deleted successfully" });
    } catch (error) {
      console.error("Error deleting project cost:", error);
      res.status(500).json({ message: "Failed to delete project cost" });
    }
  });

  // Time entry routes
  app.get("/api/time-entries/:organizationId", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);

      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "You don't have access to this organization" });
      }

      const { startDate, endDate } = req.query;
      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;

      const timeEntries = await storage.getTimeEntries(organizationId, start, end);
      res.json(timeEntries);
    } catch (error) {
      console.error("Error fetching time entries:", error);
      res.status(500).json({ message: "Failed to fetch time entries" });
    }
  });

  app.get("/api/time-entries/user/:userId", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const targetUserId = req.params.userId;
      const organizationId = req.session?.organizationId;

      if (!organizationId) {
        return res.status(400).json({ message: "No organization selected" });
      }

      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "You don't have access to this organization" });
      }

      // Users can only see their own time entries unless they're admin/owner
      if (userId !== targetUserId && userRole.role !== 'owner' && userRole.role !== 'admin') {
        return res.status(403).json({ message: "You can only view your own time entries" });
      }

      const { startDate, endDate } = req.query;
      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;

      const timeEntries = await storage.getTimeEntriesByUser(targetUserId, organizationId, start, end);
      res.json(timeEntries);
    } catch (error) {
      console.error("Error fetching user time entries:", error);
      res.status(500).json({ message: "Failed to fetch user time entries" });
    }
  });

  app.post("/api/time-entries", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const { organizationId, ...entryData } = req.body;
      
      if (!organizationId) {
        return res.status(400).json({ message: "No organization selected" });
      }

      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "You don't have access to this organization" });
      }

      const validatedData = insertTimeEntrySchema.parse({
        ...entryData,
        organizationId,
        userId: entryData.userId || userId, // Allow creating for self or others if admin
      });

      // Check if user can create time entries for others
      if (validatedData.userId !== userId && userRole.role !== 'owner' && userRole.role !== 'admin') {
        return res.status(403).json({ message: "You can only create time entries for yourself" });
      }

      const timeEntry = await storage.createTimeEntry(validatedData);
      await storage.logCreate(organizationId, userId, 'time_entry', timeEntry.id.toString(), timeEntry);
      res.status(201).json(timeEntry);
    } catch (error: any) {
      console.error("Error creating time entry:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid time entry data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create time entry" });
    }
  });

  app.put("/api/time-entries/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const entryId = parseInt(req.params.id);
      
      const entry = await storage.getTimeEntry(entryId);
      if (!entry) {
        return res.status(404).json({ message: "Time entry not found" });
      }

      const userRole = await storage.getUserRole(userId, entry.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "You don't have access to this organization" });
      }

      // Users can only edit their own time entries unless they're admin/owner
      if (entry.userId !== userId && userRole.role !== 'owner' && userRole.role !== 'admin') {
        return res.status(403).json({ message: "You can only edit your own time entries" });
      }

      const validatedData = insertTimeEntrySchema.partial().parse(req.body);
      
      const oldData = JSON.stringify(entry);
      const updated = await storage.updateTimeEntry(entryId, validatedData);
      await storage.logUpdate(entry.organizationId, userId, 'time_entry', entryId.toString(), oldData, updated);
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating time entry:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid time entry data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update time entry" });
    }
  });

  app.post("/api/time-entries/:id/clock-out", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const entryId = parseInt(req.params.id);
      
      const entry = await storage.getTimeEntry(entryId);
      if (!entry) {
        return res.status(404).json({ message: "Time entry not found" });
      }

      const userRole = await storage.getUserRole(userId, entry.organizationId);
      if (!userRole || entry.userId !== userId) {
        return res.status(403).json({ message: "You can only clock out your own time entries" });
      }

      const clockOutTime = req.body.clockOutTime ? new Date(req.body.clockOutTime) : new Date();
      const updated = await storage.clockOut(entryId, clockOutTime);
      res.json(updated);
    } catch (error) {
      console.error("Error clocking out:", error);
      res.status(500).json({ message: "Failed to clock out" });
    }
  });

  app.delete("/api/time-entries/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const entryId = parseInt(req.params.id);
      
      const entry = await storage.getTimeEntry(entryId);
      if (!entry) {
        return res.status(404).json({ message: "Time entry not found" });
      }

      const userRole = await storage.getUserRole(userId, entry.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "You don't have access to this organization" });
      }

      // Users can only delete their own time entries unless they're admin/owner
      if (entry.userId !== userId && userRole.role !== 'owner' && userRole.role !== 'admin') {
        return res.status(403).json({ message: "You can only delete your own time entries" });
      }

      await storage.logDelete(entry.organizationId, userId, 'time_entry', entryId.toString(), entry);
      await storage.deleteTimeEntry(entryId);
      res.json({ message: "Time entry deleted successfully" });
    } catch (error) {
      console.error("Error deleting time entry:", error);
      res.status(500).json({ message: "Failed to delete time entry" });
    }
  });

  // Indirect cost rate routes
  app.get("/api/indirect-cost-rates/:organizationId", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);

      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "You don't have access to this organization" });
      }

      const rates = await storage.getIndirectCostRates(organizationId);
      res.json(rates);
    } catch (error) {
      console.error("Error fetching indirect cost rates:", error);
      res.status(500).json({ message: "Failed to fetch indirect cost rates" });
    }
  });

  app.post("/api/indirect-cost-rates", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const { organizationId, ...rateData } = req.body;
      
      if (!organizationId) {
        return res.status(400).json({ message: "No organization selected" });
      }

      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole || userRole.role === 'viewer' || userRole.role === 'accountant') {
        return res.status(403).json({ message: "You don't have permission to create cost rates" });
      }

      const validatedData = insertIndirectCostRateSchema.parse({
        ...rateData,
        organizationId,
        createdBy: userId,
      });

      const rate = await storage.createIndirectCostRate(validatedData);
      await storage.logCreate(organizationId, userId, 'cost_rate', rate.id.toString(), rate);
      res.status(201).json(rate);
    } catch (error: any) {
      console.error("Error creating indirect cost rate:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid cost rate data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create indirect cost rate" });
    }
  });

  app.put("/api/indirect-cost-rates/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const rateId = parseInt(req.params.id);
      
      const rate = await storage.getIndirectCostRate(rateId);
      if (!rate) {
        return res.status(404).json({ message: "Indirect cost rate not found" });
      }

      const userRole = await storage.getUserRole(userId, rate.organizationId);
      if (!userRole || userRole.role === 'viewer' || userRole.role === 'accountant') {
        return res.status(403).json({ message: "You don't have permission to update cost rates" });
      }

      const oldData = JSON.stringify(rate);
      const updated = await storage.updateIndirectCostRate(rateId, req.body);
      await storage.logUpdate(rate.organizationId, userId, 'cost_rate', rateId.toString(), oldData, updated);
      res.json(updated);
    } catch (error) {
      console.error("Error updating indirect cost rate:", error);
      res.status(500).json({ message: "Failed to update indirect cost rate" });
    }
  });

  app.delete("/api/indirect-cost-rates/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const rateId = parseInt(req.params.id);
      
      const rate = await storage.getIndirectCostRate(rateId);
      if (!rate) {
        return res.status(404).json({ message: "Indirect cost rate not found" });
      }

      const userRole = await storage.getUserRole(userId, rate.organizationId);
      if (!userRole || userRole.role === 'viewer' || userRole.role === 'accountant') {
        return res.status(403).json({ message: "You don't have permission to delete cost rates" });
      }

      await storage.logDelete(rate.organizationId, userId, 'cost_rate', rateId.toString(), rate);
      await storage.deleteIndirectCostRate(rateId);
      res.json({ message: "Indirect cost rate deleted successfully" });
    } catch (error) {
      console.error("Error deleting indirect cost rate:", error);
      res.status(500).json({ message: "Failed to delete indirect cost rate" });
    }
  });

  // ============================================
  // ENHANCED COST ACCOUNTING ROUTES
  // ============================================

  // Labor Burden Rates Routes
  app.get("/api/labor-burden-rates/:organizationId", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);

      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "You don't have access to this organization" });
      }

      const rates = await storage.getLaborBurdenRates(organizationId);
      res.json(rates);
    } catch (error) {
      console.error("Error fetching labor burden rates:", error);
      res.status(500).json({ message: "Failed to fetch labor burden rates" });
    }
  });

  app.get("/api/labor-burden-rates/:organizationId/active", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);

      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "You don't have access to this organization" });
      }

      const rates = await storage.getActiveLaborBurdenRates(organizationId);
      res.json(rates);
    } catch (error) {
      console.error("Error fetching active labor burden rates:", error);
      res.status(500).json({ message: "Failed to fetch active labor burden rates" });
    }
  });

  app.post("/api/labor-burden-rates", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const { organizationId, ...rateData } = req.body;
      
      if (!organizationId) {
        return res.status(400).json({ message: "No organization selected" });
      }

      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole || userRole.role === 'viewer' || userRole.role === 'accountant') {
        return res.status(403).json({ message: "You don't have permission to create labor burden rates" });
      }

      const validatedData = insertLaborBurdenRateSchema.parse({
        ...rateData,
        organizationId,
        createdBy: userId,
      });

      const rate = await storage.createLaborBurdenRate(validatedData);
      await storage.logCreate(organizationId, userId, 'labor_burden_rate', rate.id.toString(), rate);
      res.status(201).json(rate);
    } catch (error: any) {
      console.error("Error creating labor burden rate:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid rate data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create labor burden rate" });
    }
  });

  app.put("/api/labor-burden-rates/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const rateId = parseInt(req.params.id);
      
      const rate = await storage.getLaborBurdenRate(rateId);
      if (!rate) {
        return res.status(404).json({ message: "Labor burden rate not found" });
      }

      const userRole = await storage.getUserRole(userId, rate.organizationId);
      if (!userRole || userRole.role === 'viewer' || userRole.role === 'accountant') {
        return res.status(403).json({ message: "You don't have permission to update labor burden rates" });
      }

      const oldData = JSON.stringify(rate);
      const updated = await storage.updateLaborBurdenRate(rateId, req.body);
      await storage.logUpdate(rate.organizationId, userId, 'labor_burden_rate', rateId.toString(), oldData, updated);
      res.json(updated);
    } catch (error) {
      console.error("Error updating labor burden rate:", error);
      res.status(500).json({ message: "Failed to update labor burden rate" });
    }
  });

  app.delete("/api/labor-burden-rates/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const rateId = parseInt(req.params.id);
      
      const rate = await storage.getLaborBurdenRate(rateId);
      if (!rate) {
        return res.status(404).json({ message: "Labor burden rate not found" });
      }

      const userRole = await storage.getUserRole(userId, rate.organizationId);
      if (!userRole || userRole.role === 'viewer' || userRole.role === 'accountant') {
        return res.status(403).json({ message: "You don't have permission to delete labor burden rates" });
      }

      await storage.logDelete(rate.organizationId, userId, 'labor_burden_rate', rateId.toString(), rate);
      await storage.deleteLaborBurdenRate(rateId);
      res.json({ message: "Labor burden rate deleted successfully" });
    } catch (error) {
      console.error("Error deleting labor burden rate:", error);
      res.status(500).json({ message: "Failed to delete labor burden rate" });
    }
  });

  // Billing Rates Routes
  app.get("/api/billing-rates/:organizationId", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);

      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "You don't have access to this organization" });
      }

      const rates = await storage.getBillingRates(organizationId);
      res.json(rates);
    } catch (error) {
      console.error("Error fetching billing rates:", error);
      res.status(500).json({ message: "Failed to fetch billing rates" });
    }
  });

  app.get("/api/billing-rates/:organizationId/active", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);

      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "You don't have access to this organization" });
      }

      const rates = await storage.getActiveBillingRates(organizationId);
      res.json(rates);
    } catch (error) {
      console.error("Error fetching active billing rates:", error);
      res.status(500).json({ message: "Failed to fetch active billing rates" });
    }
  });

  app.post("/api/billing-rates", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const { organizationId, ...rateData } = req.body;
      
      if (!organizationId) {
        return res.status(400).json({ message: "No organization selected" });
      }

      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole || userRole.role === 'viewer' || userRole.role === 'accountant') {
        return res.status(403).json({ message: "You don't have permission to create billing rates" });
      }

      const validatedData = insertBillingRateSchema.parse({
        ...rateData,
        organizationId,
        createdBy: userId,
      });

      const rate = await storage.createBillingRate(validatedData);
      await storage.logCreate(organizationId, userId, 'billing_rate', rate.id.toString(), rate);
      res.status(201).json(rate);
    } catch (error: any) {
      console.error("Error creating billing rate:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid rate data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create billing rate" });
    }
  });

  app.put("/api/billing-rates/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const rateId = parseInt(req.params.id);
      
      const rate = await storage.getBillingRate(rateId);
      if (!rate) {
        return res.status(404).json({ message: "Billing rate not found" });
      }

      const userRole = await storage.getUserRole(userId, rate.organizationId);
      if (!userRole || userRole.role === 'viewer' || userRole.role === 'accountant') {
        return res.status(403).json({ message: "You don't have permission to update billing rates" });
      }

      const oldData = JSON.stringify(rate);
      const updated = await storage.updateBillingRate(rateId, req.body);
      await storage.logUpdate(rate.organizationId, userId, 'billing_rate', rateId.toString(), oldData, updated);
      res.json(updated);
    } catch (error) {
      console.error("Error updating billing rate:", error);
      res.status(500).json({ message: "Failed to update billing rate" });
    }
  });

  app.delete("/api/billing-rates/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const rateId = parseInt(req.params.id);
      
      const rate = await storage.getBillingRate(rateId);
      if (!rate) {
        return res.status(404).json({ message: "Billing rate not found" });
      }

      const userRole = await storage.getUserRole(userId, rate.organizationId);
      if (!userRole || userRole.role === 'viewer' || userRole.role === 'accountant') {
        return res.status(403).json({ message: "You don't have permission to delete billing rates" });
      }

      await storage.logDelete(rate.organizationId, userId, 'billing_rate', rateId.toString(), rate);
      await storage.deleteBillingRate(rateId);
      res.json({ message: "Billing rate deleted successfully" });
    } catch (error) {
      console.error("Error deleting billing rate:", error);
      res.status(500).json({ message: "Failed to delete billing rate" });
    }
  });

  // Project Budget Breakdowns Routes
  app.get("/api/project-budget-breakdowns/:projectId", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const projectId = parseInt(req.params.projectId);

      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const userRole = await storage.getUserRole(userId, project.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "You don't have access to this organization" });
      }

      const breakdowns = await storage.getProjectBudgetBreakdowns(projectId);
      res.json(breakdowns);
    } catch (error) {
      console.error("Error fetching project budget breakdowns:", error);
      res.status(500).json({ message: "Failed to fetch project budget breakdowns" });
    }
  });

  app.post("/api/project-budget-breakdowns", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const { organizationId, projectId, ...breakdownData } = req.body;
      
      if (!organizationId || !projectId) {
        return res.status(400).json({ message: "Organization and project are required" });
      }

      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole || userRole.role === 'viewer' || userRole.role === 'accountant') {
        return res.status(403).json({ message: "You don't have permission to create budget breakdowns" });
      }

      const validatedData = insertProjectBudgetBreakdownSchema.parse({
        ...breakdownData,
        organizationId,
        projectId,
        createdBy: userId,
      });

      const breakdown = await storage.createProjectBudgetBreakdown(validatedData);
      await storage.logCreate(organizationId, userId, 'project_budget_breakdown', breakdown.id.toString(), breakdown);
      res.status(201).json(breakdown);
    } catch (error: any) {
      console.error("Error creating project budget breakdown:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid breakdown data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create project budget breakdown" });
    }
  });

  app.put("/api/project-budget-breakdowns/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const breakdownId = parseInt(req.params.id);
      
      const breakdown = await storage.getProjectBudgetBreakdown(breakdownId);
      if (!breakdown) {
        return res.status(404).json({ message: "Project budget breakdown not found" });
      }

      const userRole = await storage.getUserRole(userId, breakdown.organizationId);
      if (!userRole || userRole.role === 'viewer' || userRole.role === 'accountant') {
        return res.status(403).json({ message: "You don't have permission to update budget breakdowns" });
      }

      const oldData = JSON.stringify(breakdown);
      const updated = await storage.updateProjectBudgetBreakdown(breakdownId, req.body);
      await storage.logUpdate(breakdown.organizationId, userId, 'project_budget_breakdown', breakdownId.toString(), oldData, updated);
      res.json(updated);
    } catch (error) {
      console.error("Error updating project budget breakdown:", error);
      res.status(500).json({ message: "Failed to update project budget breakdown" });
    }
  });

  app.delete("/api/project-budget-breakdowns/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const breakdownId = parseInt(req.params.id);
      
      const breakdown = await storage.getProjectBudgetBreakdown(breakdownId);
      if (!breakdown) {
        return res.status(404).json({ message: "Project budget breakdown not found" });
      }

      const userRole = await storage.getUserRole(userId, breakdown.organizationId);
      if (!userRole || userRole.role === 'viewer' || userRole.role === 'accountant') {
        return res.status(403).json({ message: "You don't have permission to delete budget breakdowns" });
      }

      await storage.logDelete(breakdown.organizationId, userId, 'project_budget_breakdown', breakdownId.toString(), breakdown);
      await storage.deleteProjectBudgetBreakdown(breakdownId);
      res.json({ message: "Project budget breakdown deleted successfully" });
    } catch (error) {
      console.error("Error deleting project budget breakdown:", error);
      res.status(500).json({ message: "Failed to delete project budget breakdown" });
    }
  });

  // Project Revenue Ledger Routes
  app.get("/api/project-revenue-ledger/:projectId", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const projectId = parseInt(req.params.projectId);

      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const userRole = await storage.getUserRole(userId, project.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "You don't have access to this organization" });
      }

      // Add pagination support (default: first 100 entries)
      const limit = parseInt(req.query.limit as string) || 100;
      const offset = parseInt(req.query.offset as string) || 0;

      const [ledgerEntries, total] = await Promise.all([
        storage.getProjectRevenueLedger(projectId, limit, offset),
        storage.getProjectRevenueLedgerCount(projectId)
      ]);
      
      res.json({
        entries: ledgerEntries,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total
        }
      });
    } catch (error) {
      console.error("Error fetching project revenue ledger:", error);
      res.status(500).json({ message: "Failed to fetch project revenue ledger" });
    }
  });

  app.post("/api/project-revenue-ledger", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const { organizationId, projectId, ...ledgerData } = req.body;
      
      if (!organizationId || !projectId) {
        return res.status(400).json({ message: "Organization and project are required" });
      }

      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole || userRole.role === 'viewer' || userRole.role === 'accountant') {
        return res.status(403).json({ message: "You don't have permission to create revenue ledger entries" });
      }

      const validatedData = insertProjectRevenueLedgerSchema.parse({
        ...ledgerData,
        organizationId,
        projectId,
        createdBy: userId,
      });

      const entry = await storage.createProjectRevenueLedger(validatedData);
      await storage.logCreate(organizationId, userId, 'project_revenue_ledger', entry.id.toString(), entry);
      res.status(201).json(entry);
    } catch (error: any) {
      console.error("Error creating project revenue ledger entry:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid ledger data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create project revenue ledger entry" });
    }
  });

  app.put("/api/project-revenue-ledger/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const entryId = parseInt(req.params.id);
      
      const entry = await storage.getProjectRevenueLedgerEntry(entryId);
      if (!entry) {
        return res.status(404).json({ message: "Project revenue ledger entry not found" });
      }

      const userRole = await storage.getUserRole(userId, entry.organizationId);
      if (!userRole || userRole.role === 'viewer' || userRole.role === 'accountant') {
        return res.status(403).json({ message: "You don't have permission to update revenue ledger entries" });
      }

      // Validate revenue status state transitions: unbilled → billed → recognized (no backward transitions)
      if (req.body.revenueStatus && req.body.revenueStatus !== entry.revenueStatus) {
        const currentStatus = entry.revenueStatus;
        const newStatus = req.body.revenueStatus;
        const validTransitions: Record<string, string[]> = {
          'unbilled': ['billed'],
          'billed': ['recognized'],
          'recognized': ['written_off'],
          'written_off': [] // Terminal state
        };

        if (!validTransitions[currentStatus]?.includes(newStatus)) {
          return res.status(400).json({ 
            message: `Invalid revenue status transition from ${currentStatus} to ${newStatus}. Valid transitions from ${currentStatus}: ${validTransitions[currentStatus]?.join(', ') || 'none (terminal state)'}`
          });
        }
      }

      const oldData = JSON.stringify(entry);
      const updated = await storage.updateProjectRevenueLedger(entryId, req.body);
      await storage.logUpdate(entry.organizationId, userId, 'project_revenue_ledger', entryId.toString(), oldData, updated);
      res.json(updated);
    } catch (error) {
      console.error("Error updating project revenue ledger entry:", error);
      res.status(500).json({ message: "Failed to update project revenue ledger entry" });
    }
  });

  app.delete("/api/project-revenue-ledger/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const entryId = parseInt(req.params.id);
      
      const entry = await storage.getProjectRevenueLedgerEntry(entryId);
      if (!entry) {
        return res.status(404).json({ message: "Project revenue ledger entry not found" });
      }

      const userRole = await storage.getUserRole(userId, entry.organizationId);
      if (!userRole || userRole.role === 'viewer' || userRole.role === 'accountant') {
        return res.status(403).json({ message: "You don't have permission to delete revenue ledger entries" });
      }

      await storage.logDelete(entry.organizationId, userId, 'project_revenue_ledger', entryId.toString(), entry);
      await storage.deleteProjectRevenueLedger(entryId);
      res.json({ message: "Project revenue ledger entry deleted successfully" });
    } catch (error) {
      console.error("Error deleting project revenue ledger entry:", error);
      res.status(500).json({ message: "Failed to delete project revenue ledger entry" });
    }
  });

  // Project Financial Snapshots Routes
  app.get("/api/project-financial-snapshots/:projectId", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const projectId = parseInt(req.params.projectId);

      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const userRole = await storage.getUserRole(userId, project.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "You don't have access to this organization" });
      }

      // Add pagination support (default: first 50 snapshots, usually fewer needed)
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const [snapshots, total] = await Promise.all([
        storage.getProjectFinancialSnapshots(projectId, limit, offset),
        storage.getProjectFinancialSnapshotsCount(projectId)
      ]);
      
      res.json({
        snapshots,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total
        }
      });
    } catch (error) {
      console.error("Error fetching project financial snapshots:", error);
      res.status(500).json({ message: "Failed to fetch project financial snapshots" });
    }
  });

  app.post("/api/project-financial-snapshots", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const { organizationId, projectId, ...snapshotData } = req.body;
      
      if (!organizationId || !projectId) {
        return res.status(400).json({ message: "Organization and project are required" });
      }

      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole || userRole.role === 'viewer' || userRole.role === 'accountant') {
        return res.status(403).json({ message: "You don't have permission to create financial snapshots" });
      }

      const validatedData = insertProjectFinancialSnapshotSchema.parse({
        ...snapshotData,
        organizationId,
        projectId,
      });

      const snapshot = await storage.createProjectFinancialSnapshot(validatedData);
      await storage.logCreate(organizationId, userId, 'project_financial_snapshot', snapshot.id.toString(), snapshot);
      res.status(201).json(snapshot);
    } catch (error: any) {
      console.error("Error creating project financial snapshot:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid snapshot data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create project financial snapshot" });
    }
  });

  // ============================================
  // GOVERNMENT GRANTS (NONPROFIT) ROUTES
  // ============================================

  // Time/Effort Reporting Routes
  app.get("/api/time-effort-reports/:organizationId", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);

      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "You don't have access to this organization" });
      }

      const reports = await storage.getTimeEffortReports(organizationId);
      res.json(reports);
    } catch (error) {
      console.error("Error fetching time effort reports:", error);
      res.status(500).json({ message: "Failed to fetch time effort reports" });
    }
  });

  app.post("/api/time-effort-reports", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const { organizationId, ...reportData } = req.body;
      
      if (!organizationId) {
        return res.status(400).json({ message: "No organization selected" });
      }

      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole || userRole.role === 'viewer') {
        return res.status(403).json({ message: "You don't have permission to create time effort reports" });
      }

      const validatedData = insertTimeEffortReportSchema.parse({
        ...reportData,
        organizationId,
        createdBy: userId,
      });

      const report = await storage.createTimeEffortReport(validatedData);
      await storage.logCreate(organizationId, userId, 'time_effort_report', report.id.toString(), report);
      res.status(201).json(report);
    } catch (error: any) {
      console.error("Error creating time effort report:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid report data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create time effort report" });
    }
  });

  app.put("/api/time-effort-reports/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const reportId = parseInt(req.params.id);
      const updates = req.body;

      const existing = await storage.getTimeEffortReportById(reportId);
      if (!existing) {
        return res.status(404).json({ message: "Time effort report not found" });
      }

      const userRole = await storage.getUserRole(userId, existing.organizationId);
      if (!userRole || userRole.role === 'viewer') {
        return res.status(403).json({ message: "You don't have permission to update time effort reports" });
      }

      const updated = await storage.updateTimeEffortReport(reportId, updates);
      await storage.logUpdate(existing.organizationId, userId, 'time_effort_report', reportId.toString(), existing, updated);
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating time effort report:", error);
      res.status(500).json({ message: "Failed to update time effort report" });
    }
  });

  app.delete("/api/time-effort-reports/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const reportId = parseInt(req.params.id);

      const existing = await storage.getTimeEffortReportById(reportId);
      if (!existing) {
        return res.status(404).json({ message: "Time effort report not found" });
      }

      const userRole = await storage.getUserRole(userId, existing.organizationId);
      if (!userRole || (userRole.role !== 'owner' && userRole.role !== 'admin')) {
        return res.status(403).json({ message: "You don't have permission to delete time effort reports" });
      }

      await storage.deleteTimeEffortReport(reportId);
      await storage.logDelete(existing.organizationId, userId, 'time_effort_report', reportId.toString(), existing);
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting time effort report:", error);
      res.status(500).json({ message: "Failed to delete time effort report" });
    }
  });

  // Cost Allowability Check Routes
  app.get("/api/cost-allowability-checks/:organizationId", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);

      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "You don't have access to this organization" });
      }

      const checks = await storage.getCostAllowabilityChecks(organizationId);
      res.json(checks);
    } catch (error) {
      console.error("Error fetching cost allowability checks:", error);
      res.status(500).json({ message: "Failed to fetch cost allowability checks" });
    }
  });

  app.post("/api/cost-allowability-checks", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const { organizationId, ...checkData } = req.body;
      
      if (!organizationId) {
        return res.status(400).json({ message: "No organization selected" });
      }

      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole || userRole.role === 'viewer') {
        return res.status(403).json({ message: "You don't have permission to create cost allowability checks" });
      }

      const validatedData = insertCostAllowabilityCheckSchema.parse({
        ...checkData,
        organizationId,
        createdBy: userId,
      });

      const check = await storage.createCostAllowabilityCheck(validatedData);
      await storage.logCreate(organizationId, userId, 'cost_allowability_check', check.id.toString(), check);
      res.status(201).json(check);
    } catch (error: any) {
      console.error("Error creating cost allowability check:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid check data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create cost allowability check" });
    }
  });

  app.put("/api/cost-allowability-checks/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const checkId = parseInt(req.params.id);
      const updates = req.body;

      const existing = await storage.getCostAllowabilityCheckById(checkId);
      if (!existing) {
        return res.status(404).json({ message: "Cost allowability check not found" });
      }

      const userRole = await storage.getUserRole(userId, existing.organizationId);
      if (!userRole || userRole.role === 'viewer') {
        return res.status(403).json({ message: "You don't have permission to update cost allowability checks" });
      }

      const updated = await storage.updateCostAllowabilityCheck(checkId, updates);
      await storage.logUpdate(existing.organizationId, userId, 'cost_allowability_check', checkId.toString(), existing, updated);
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating cost allowability check:", error);
      res.status(500).json({ message: "Failed to update cost allowability check" });
    }
  });

  app.delete("/api/cost-allowability-checks/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const checkId = parseInt(req.params.id);

      const existing = await storage.getCostAllowabilityCheckById(checkId);
      if (!existing) {
        return res.status(404).json({ message: "Cost allowability check not found" });
      }

      const userRole = await storage.getUserRole(userId, existing.organizationId);
      if (!userRole || (userRole.role !== 'owner' && userRole.role !== 'admin')) {
        return res.status(403).json({ message: "You don't have permission to delete cost allowability checks" });
      }

      await storage.deleteCostAllowabilityCheck(checkId);
      await storage.logDelete(existing.organizationId, userId, 'cost_allowability_check', checkId.toString(), existing);
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting cost allowability check:", error);
      res.status(500).json({ message: "Failed to delete cost allowability check" });
    }
  });

  // Sub Award Routes
  app.get("/api/sub-awards/:organizationId", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);

      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "You don't have access to this organization" });
      }

      const awards = await storage.getSubAwards(organizationId);
      res.json(awards);
    } catch (error) {
      console.error("Error fetching sub-awards:", error);
      res.status(500).json({ message: "Failed to fetch sub-awards" });
    }
  });

  app.post("/api/sub-awards", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const { organizationId, ...awardData } = req.body;
      
      if (!organizationId) {
        return res.status(400).json({ message: "No organization selected" });
      }

      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole || userRole.role === 'viewer') {
        return res.status(403).json({ message: "You don't have permission to create sub-awards" });
      }

      const validatedData = insertSubAwardSchema.parse({
        ...awardData,
        organizationId,
        createdBy: userId,
      });

      const award = await storage.createSubAward(validatedData);
      await storage.logCreate(organizationId, userId, 'sub_award', award.id.toString(), award);
      res.status(201).json(award);
    } catch (error: any) {
      console.error("Error creating sub-award:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid award data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create sub-award" });
    }
  });

  app.put("/api/sub-awards/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const awardId = parseInt(req.params.id);
      const updates = req.body;

      const existing = await storage.getSubAwardById(awardId);
      if (!existing) {
        return res.status(404).json({ message: "Sub-award not found" });
      }

      const userRole = await storage.getUserRole(userId, existing.organizationId);
      if (!userRole || userRole.role === 'viewer') {
        return res.status(403).json({ message: "You don't have permission to update sub-awards" });
      }

      const updated = await storage.updateSubAward(awardId, updates);
      await storage.logUpdate(existing.organizationId, userId, 'sub_award', awardId.toString(), existing, updated);
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating sub-award:", error);
      res.status(500).json({ message: "Failed to update sub-award" });
    }
  });

  app.delete("/api/sub-awards/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const awardId = parseInt(req.params.id);

      const existing = await storage.getSubAwardById(awardId);
      if (!existing) {
        return res.status(404).json({ message: "Sub-award not found" });
      }

      const userRole = await storage.getUserRole(userId, existing.organizationId);
      if (!userRole || (userRole.role !== 'owner' && userRole.role !== 'admin')) {
        return res.status(403).json({ message: "You don't have permission to delete sub-awards" });
      }

      await storage.deleteSubAward(awardId);
      await storage.logDelete(existing.organizationId, userId, 'sub_award', awardId.toString(), existing);
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting sub-award:", error);
      res.status(500).json({ message: "Failed to delete sub-award" });
    }
  });

  // Federal Financial Report Routes
  app.get("/api/federal-financial-reports/:organizationId", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);

      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "You don't have access to this organization" });
      }

      const reports = await storage.getFederalFinancialReports(organizationId);
      res.json(reports);
    } catch (error) {
      console.error("Error fetching federal financial reports:", error);
      res.status(500).json({ message: "Failed to fetch federal financial reports" });
    }
  });

  app.post("/api/federal-financial-reports", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const { organizationId, ...reportData } = req.body;
      
      if (!organizationId) {
        return res.status(400).json({ message: "No organization selected" });
      }

      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole || userRole.role === 'viewer') {
        return res.status(403).json({ message: "You don't have permission to create federal financial reports" });
      }

      const validatedData = insertFederalFinancialReportSchema.parse({
        ...reportData,
        organizationId,
        createdBy: userId,
      });

      const report = await storage.createFederalFinancialReport(validatedData);
      await storage.logCreate(organizationId, userId, 'federal_financial_report', report.id.toString(), report);
      res.status(201).json(report);
    } catch (error: any) {
      console.error("Error creating federal financial report:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid report data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create federal financial report" });
    }
  });

  app.put("/api/federal-financial-reports/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const reportId = parseInt(req.params.id);
      const updates = req.body;

      const existing = await storage.getFederalFinancialReportById(reportId);
      if (!existing) {
        return res.status(404).json({ message: "Federal financial report not found" });
      }

      const userRole = await storage.getUserRole(userId, existing.organizationId);
      if (!userRole || userRole.role === 'viewer') {
        return res.status(403).json({ message: "You don't have permission to update federal financial reports" });
      }

      const updated = await storage.updateFederalFinancialReport(reportId, updates);
      await storage.logUpdate(existing.organizationId, userId, 'federal_financial_report', reportId.toString(), existing, updated);
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating federal financial report:", error);
      res.status(500).json({ message: "Failed to update federal financial report" });
    }
  });

  app.delete("/api/federal-financial-reports/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const reportId = parseInt(req.params.id);

      const existing = await storage.getFederalFinancialReportById(reportId);
      if (!existing) {
        return res.status(404).json({ message: "Federal financial report not found" });
      }

      const userRole = await storage.getUserRole(userId, existing.organizationId);
      if (!userRole || (userRole.role !== 'owner' && userRole.role !== 'admin')) {
        return res.status(403).json({ message: "You don't have permission to delete federal financial reports" });
      }

      await storage.deleteFederalFinancialReport(reportId);
      await storage.logDelete(existing.organizationId, userId, 'federal_financial_report', reportId.toString(), existing);
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting federal financial report:", error);
      res.status(500).json({ message: "Failed to delete federal financial report" });
    }
  });

  // Audit Prep Item Routes
  app.get("/api/audit-prep-items/:organizationId", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);

      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "You don't have access to this organization" });
      }

      const items = await storage.getAuditPrepItems(organizationId);
      res.json(items);
    } catch (error) {
      console.error("Error fetching audit prep items:", error);
      res.status(500).json({ message: "Failed to fetch audit prep items" });
    }
  });

  app.post("/api/audit-prep-items", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const { organizationId, ...itemData } = req.body;
      
      if (!organizationId) {
        return res.status(400).json({ message: "No organization selected" });
      }

      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole || userRole.role === 'viewer') {
        return res.status(403).json({ message: "You don't have permission to create audit prep items" });
      }

      const validatedData = insertAuditPrepItemSchema.parse({
        ...itemData,
        organizationId,
        createdBy: userId,
      });

      const item = await storage.createAuditPrepItem(validatedData);
      await storage.logCreate(organizationId, userId, 'audit_prep_item', item.id.toString(), item);
      res.status(201).json(item);
    } catch (error: any) {
      console.error("Error creating audit prep item:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ message: "Invalid item data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create audit prep item" });
    }
  });

  app.put("/api/audit-prep-items/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const itemId = parseInt(req.params.id);
      const updates = req.body;

      const existing = await storage.getAuditPrepItemById(itemId);
      if (!existing) {
        return res.status(404).json({ message: "Audit prep item not found" });
      }

      const userRole = await storage.getUserRole(userId, existing.organizationId);
      if (!userRole || userRole.role === 'viewer') {
        return res.status(403).json({ message: "You don't have permission to update audit prep items" });
      }

      const updated = await storage.updateAuditPrepItem(itemId, updates);
      await storage.logUpdate(existing.organizationId, userId, 'audit_prep_item', itemId.toString(), existing, updated);
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating audit prep item:", error);
      res.status(500).json({ message: "Failed to update audit prep item" });
    }
  });

  app.delete("/api/audit-prep-items/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const itemId = parseInt(req.params.id);

      const existing = await storage.getAuditPrepItemById(itemId);
      if (!existing) {
        return res.status(404).json({ message: "Audit prep item not found" });
      }

      const userRole = await storage.getUserRole(userId, existing.organizationId);
      if (!userRole || (userRole.role !== 'owner' && userRole.role !== 'admin')) {
        return res.status(403).json({ message: "You don't have permission to delete audit prep items" });
      }

      await storage.deleteAuditPrepItem(itemId);
      await storage.logDelete(existing.organizationId, userId, 'audit_prep_item', itemId.toString(), existing);
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting audit prep item:", error);
      res.status(500).json({ message: "Failed to delete audit prep item" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
