// Referenced from javascript_log_in_with_replit blueprint
import type { Express } from "express";
import { createServer, type Server } from "http";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { storage } from "./storage";

// Check if we're in a Replit environment
const isReplitEnvironment = !!(process.env.REPLIT_DOMAINS && process.env.REPL_ID);
import { setupAuth, isAuthenticated, isAuthenticatedAllowPendingMfa, requireMfaCompliance, hashPassword, comparePasswords } from "./replitAuth";
import { plaidClient } from "./plaid";
import { suggestCategory, suggestCategoryBulk, suggestEnhancedMatching } from "./aiCategorization";
import { detectRecurringPatterns, suggestBudget, createBillFromPattern } from "./aiPatternDetection";
import { ObjectStorageService } from "./objectStorage";
import { runVulnerabilityScan, getLatestVulnerabilitySummary } from "./vulnerabilityScanner";
import { sendInvoiceEmail, sendDonationLetterEmail } from "./email";
import { stripeService } from "./stripeService";
import { getStripePublishableKey, createInvoiceCheckoutSession } from "./stripeClient";
import { generateInvoicePdf } from "./invoicePdf";
import finchRoutes from "./finch";
import memoize from "memoizee";
import multer from "multer";
import Papa from "papaparse";
import { z } from "zod";
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
  updateGrantSchema,
  insertBudgetSchema,
  insertBudgetItemSchema,
  insertBudgetIncomeItemSchema,
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
  // Bank Reconciliation schemas
  insertBankReconciliationSchema,
  insertBankStatementEntrySchema,
  type InsertBankReconciliation,
  type InsertBankStatementEntry,
  // Bill Payment Automation schemas
  insertAutoPayRuleSchema,
  insertScheduledPaymentSchema,
  insertBillPaymentSchema,
  insertVendorPaymentDetailsSchema,
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


  // Finch payroll/HRIS integration routes
  app.use('/api/finch', finchRoutes);

  // Serve object storage files (logos, uploads, etc.) - Replit only
  // Only serves PUBLIC files - private files require authentication
  app.get('/objects/*', async (req, res) => {
    // This route only works on Replit - on other platforms, files are served via /uploads/*
    if (!isReplitEnvironment) {
      return res.status(404).json({ message: "Object storage not available on this platform" });
    }
    
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

  // Serve local uploads (for non-Replit environments like Render)
  // SECURITY: Path traversal protection - ensure requested path stays within uploads directory
  // NOTE: Unencoded path traversal (../) is normalized by HTTP clients before reaching server
  // URL-encoded traversal (%2e%2e/ or %2f) bypasses client normalization and IS blocked here
  app.get('/uploads/*', async (req, res) => {
    const uploadsDir = path.resolve(process.cwd(), 'uploads');
    
    // Extract path after /uploads/ - do NOT normalize before extraction
    // Use req.params[0] for wildcard match (preserves encoding better than req.path)
    const rawPath = req.params[0] || '';
    
    // Decode URL-encoded characters and normalize the path
    const decodedPath = decodeURIComponent(rawPath);
    
    // Resolve the full path (this handles .. sequences)
    const filePath = path.resolve(uploadsDir, decodedPath);
    
    // CRITICAL: Check if resolved path is within uploads directory
    // Using path.resolve ensures we get absolute paths for accurate comparison
    if (!filePath.startsWith(uploadsDir + path.sep) && filePath !== uploadsDir) {
      // Log path traversal attempt as security event
      try {
        await storage.logSecurityEvent({
          eventType: 'suspicious_activity',
          severity: 'warning',
          userId: null,
          email: null,
          ipAddress: req.ip || req.socket.remoteAddress || null,
          userAgent: req.get('user-agent') || null,
          eventData: {
            type: 'path_traversal_attempt',
            requestedPath: req.path,
            decodedPath: decodedPath,
            resolvedPath: filePath,
            uploadsDir: uploadsDir,
            timestamp: new Date().toISOString(),
          },
        });
      } catch (logError) {
        console.error('Failed to log path traversal attempt:', logError);
      }
      return res.status(403).json({ message: "Access denied" });
    }
    
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      res.sendFile(filePath);
    } else {
      res.status(404).json({ message: "File not found" });
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

  // Password change route (for local auth only)
  app.post('/api/auth/change-password', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current password and new password are required" });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({ message: "New password must be at least 8 characters long" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (!user.passwordHash) {
        return res.status(400).json({ message: "Password change is not available for this account type" });
      }

      const isCurrentPasswordValid = await comparePasswords(currentPassword, user.passwordHash);
      if (!isCurrentPasswordValid) {
        await storage.logSecurityEvent({
          eventType: 'password_change_failed',
          severity: 'warning',
          userId: userId,
          email: user.email || null,
          ipAddress: req.ip || req.socket.remoteAddress || null,
          userAgent: req.get('user-agent') || null,
          eventData: {
            reason: 'invalid_current_password',
            timestamp: new Date().toISOString(),
          },
        });
        return res.status(401).json({ message: "Current password is incorrect" });
      }

      const newPasswordHash = await hashPassword(newPassword);
      await storage.updateUserPassword(userId, newPasswordHash);

      await storage.logSecurityEvent({
        eventType: 'password_changed',
        severity: 'info',
        userId: userId,
        email: user.email || null,
        ipAddress: req.ip || req.socket.remoteAddress || null,
        userAgent: req.get('user-agent') || null,
        eventData: {
          timestamp: new Date().toISOString(),
        },
      });

      res.json({ success: true, message: "Password changed successfully" });
    } catch (error) {
      console.error("Error changing password:", error);
      res.status(500).json({ message: "Failed to change password" });
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
      
      console.log(`[Invoice Settings] User ${userId} updating org ${organizationId}`);
      
      // Check user has owner or admin role
      const userRole = await storage.getUserRole(userId, organizationId);
      console.log(`[Invoice Settings] User role:`, userRole);
      
      if (!userRole || (userRole.role !== 'owner' && userRole.role !== 'admin')) {
        console.log(`[Invoice Settings] Access denied - role: ${userRole?.role}`);
        return res.status(403).json({ message: "Only owners and admins can update invoice settings" });
      }

      // Only allow updating invoice-related fields
      const allowedFields = [
        'logoUrl', 'companyName', 'companyAddress', 'companyPhone', 
        'companyEmail', 'companyWebsite', 'taxId', 'invoicePrefix', 'invoiceNotes',
        'invoicePrimaryColor', 'invoiceAccentColor', 'invoiceFontFamily', 'invoiceTemplate',
        'invoicePaymentTerms', 'invoicePaymentMethods', 'invoiceFooter',
        'venmoUsername', 'paypalEmail', 'cashappUsername', 'stripeEnabled'
      ] as const;
      
      // SECURITY NOTE: This bracket notation is safe because 'field' is derived from the
      // hardcoded 'allowedFields' array above, NOT from user input. This is an allowlist
      // pattern that prevents prototype pollution - only explicitly permitted field names
      // are extracted from req.body. Static analyzers may flag this as a false positive.
      const updates: Record<string, any> = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      }

      console.log(`[Invoice Settings] Updating with fields:`, Object.keys(updates));
      
      // Check if organization exists first
      const existingOrg = await storage.getOrganization(organizationId);
      if (!existingOrg) {
        console.log(`[Invoice Settings] Organization ${organizationId} not found`);
        return res.status(404).json({ message: "Organization not found" });
      }
      
      const updated = await storage.updateOrganization(organizationId, updates);
      console.log(`[Invoice Settings] Update successful`);
      res.json(updated);
    } catch (error: any) {
      console.error("[Invoice Settings] Error:", error?.message || error);
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

      let logoPath = req.body.logoUrl;
      
      // Only normalize path on Replit environment
      if (isReplitEnvironment) {
        const objectStorageService = new ObjectStorageService();
        logoPath = objectStorageService.normalizeObjectEntityPath(req.body.logoUrl);
      }
      
      const updated = await storage.updateOrganization(organizationId, { logoUrl: logoPath });
      res.json(updated);
    } catch (error) {
      console.error("Error updating logo:", error);
      res.status(500).json({ message: "Failed to update logo" });
    }
  });

  // Delete organization (owner only)
  app.delete('/api/organizations/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.id);
      
      // Check organization exists
      const organization = await storage.getOrganization(organizationId);
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }
      
      // Only organization owner can delete
      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole || userRole.role !== 'owner') {
        return res.status(403).json({ message: "Only the organization owner can delete the organization" });
      }

      // Log the deletion for audit purposes
      await storage.logSecurityEvent({
        eventType: 'organization_deleted',
        severity: 'warning',
        userId: userId,
        organizationId: organizationId,
        email: null,
        ipAddress: req.ip || req.socket.remoteAddress || null,
        userAgent: req.get('user-agent') || null,
        eventData: {
          organizationName: organization.name,
          timestamp: new Date().toISOString(),
        },
      });

      // Delete the organization (cascades to all related data)
      await storage.deleteOrganization(organizationId);
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting organization:", error);
      res.status(500).json({ message: "Failed to delete organization" });
    }
  });

  // Invitation routes
  app.post('/api/invitations/:organizationId', isAuthenticated, requireMfaCompliance, async (req: any, res) => {
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

  app.patch('/api/team/:organizationId/:userId/role', isAuthenticated, requireMfaCompliance, async (req: any, res) => {
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

  app.delete('/api/team/:organizationId/:userId', isAuthenticated, requireMfaCompliance, async (req: any, res) => {
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

      // Validate parent category if provided
      if (data.parentCategoryId) {
        const parentCategory = await storage.getCategory(data.parentCategoryId);
        
        if (!parentCategory) {
          return res.status(400).json({ message: "Parent category not found" });
        }
        
        if (parentCategory.organizationId !== data.organizationId) {
          return res.status(400).json({ message: "Parent category must be in the same organization" });
        }
        
        if (parentCategory.type !== data.type) {
          return res.status(400).json({ message: "Parent category must be the same type (income/expense)" });
        }
        
        if (parentCategory.parentCategoryId) {
          return res.status(400).json({ message: "Cannot create subcategory of a subcategory (max 1 level deep)" });
        }
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

      // Validate parent category if being updated
      if (updates.parentCategoryId !== undefined) {
        if (updates.parentCategoryId === categoryId) {
          return res.status(400).json({ message: "Category cannot be its own parent" });
        }
        
        if (updates.parentCategoryId !== null) {
          const parentCategory = await storage.getCategory(updates.parentCategoryId);
          
          if (!parentCategory) {
            return res.status(400).json({ message: "Parent category not found" });
          }
          
          if (parentCategory.organizationId !== category.organizationId) {
            return res.status(400).json({ message: "Parent category must be in the same organization" });
          }
          
          const categoryType = updates.type ?? category.type;
          if (parentCategory.type !== categoryType) {
            return res.status(400).json({ message: "Parent category must be the same type (income/expense)" });
          }
          
          if (parentCategory.parentCategoryId) {
            return res.status(400).json({ message: "Cannot create subcategory of a subcategory (max 1 level deep)" });
          }
          
          if (parentCategory.id === categoryId) {
            return res.status(400).json({ message: "Category cannot be its own parent" });
          }
        }
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

  // ============================================
  // DONOR PORTAL ROUTES (Public-facing for donors)
  // ============================================

  // Send access link to donor (authenticated org users only)
  app.post('/api/donor-portal/send-access-link/:donorId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const donorId = parseInt(req.params.donorId);
      
      const donor = await storage.getDonor(donorId);
      if (!donor) {
        return res.status(404).json({ message: "Donor not found" });
      }
      
      if (!donor.email) {
        return res.status(400).json({ message: "Donor does not have an email address" });
      }
      
      const userRole = await storage.getUserRole(userId, donor.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const organization = await storage.getOrganization(donor.organizationId);
      if (!organization || organization.type !== 'nonprofit') {
        return res.status(403).json({ message: "Donor portal is only available for nonprofit organizations" });
      }
      
      // Create access token
      const accessToken = await storage.createDonorAccessToken(donorId, donor.organizationId);
      
      // Send email with access link
      const portalUrl = `${process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : 'https://complybook.net'}/donor-portal?token=${accessToken.token}`;
      
      // Use SendGrid to send the email
      const sgMail = await import('@sendgrid/mail');
      if (process.env.SENDGRID_API_KEY) {
        sgMail.default.setApiKey(process.env.SENDGRID_API_KEY);
        
        const brandSettings = await storage.getBrandSettings(donor.organizationId);
        const orgName = organization.name;
        
        await sgMail.default.send({
          to: donor.email,
          from: brandSettings?.primaryEmail || 'tech@jandmsolutions.com',
          subject: `Your Donor Portal Access - ${orgName}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Hello ${donor.name},</h2>
              <p>You have been granted access to the ${orgName} donor portal.</p>
              <p>Click the button below to view your giving history, pledges, and tax letters:</p>
              <p style="text-align: center; margin: 30px 0;">
                <a href="${portalUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                  Access Your Donor Portal
                </a>
              </p>
              <p style="color: #666; font-size: 14px;">This link will expire in 7 days for security purposes.</p>
              <p style="color: #666; font-size: 14px;">If you did not request this access, please ignore this email.</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
              <p style="color: #999; font-size: 12px;">Sent by ${orgName} via ComplyBook</p>
            </div>
          `,
        });
        
        res.json({ success: true, message: "Access link sent to donor's email" });
      } else {
        // No SendGrid configured - return the link directly
        res.json({ 
          success: true, 
          message: "Email not configured. Share this link with the donor:",
          portalUrl 
        });
      }
    } catch (error) {
      console.error("Error sending donor access link:", error);
      res.status(500).json({ message: "Failed to send access link" });
    }
  });

  // Validate donor access token (public route - no auth required)
  app.get('/api/donor-portal/validate/:token', async (req: any, res) => {
    try {
      const token = req.params.token;
      
      const result = await storage.getDonorByAccessToken(token);
      if (!result) {
        return res.status(401).json({ message: "Invalid or expired access token" });
      }
      
      // Mark token as used (for audit purposes)
      await storage.markDonorAccessTokenUsed(token);
      
      res.json({ 
        valid: true, 
        donorId: result.donor.id,
        donorName: result.donor.name 
      });
    } catch (error) {
      console.error("Error validating donor token:", error);
      res.status(500).json({ message: "Failed to validate token" });
    }
  });

  // Get donor portal data (public route - token-based auth)
  app.get('/api/donor-portal/data/:token', async (req: any, res) => {
    try {
      const token = req.params.token;
      
      const result = await storage.getDonorByAccessToken(token);
      if (!result) {
        return res.status(401).json({ message: "Invalid or expired access token" });
      }
      
      const portalData = await storage.getDonorPortalData(result.donor.id);
      
      // Get brand settings for organization customization
      const brandSettings = await storage.getBrandSettings(result.organizationId);
      
      res.json({
        donor: {
          id: portalData.donor.id,
          name: portalData.donor.name,
          email: portalData.donor.email,
          phone: portalData.donor.phone,
          address: portalData.donor.address,
        },
        organization: {
          id: portalData.organization.id,
          name: portalData.organization.name,
        },
        pledges: portalData.pledges.map(p => ({
          id: p.id,
          amount: p.amount,
          pledgeDate: p.pledgeDate,
          dueDate: p.dueDate,
          status: p.status,
          amountPaid: p.amountPaid,
          notes: p.notes,
        })),
        donations: portalData.donationHistory.map(d => ({
          id: d.id,
          date: d.date,
          amount: d.amount,
          description: d.description,
        })),
        letters: portalData.letters.map(l => ({
          id: l.id,
          year: l.year,
          letterType: l.letterType,
          letterStatus: l.letterStatus,
          donationAmount: l.donationAmount,
          renderedHtml: l.renderedHtml,
        })),
        brandSettings: brandSettings ? {
          primaryColor: brandSettings.primaryColor,
          logoUrl: brandSettings.logoUrl,
          organizationName: brandSettings.organizationName || portalData.organization.name,
        } : null,
      });
    } catch (error) {
      console.error("Error fetching donor portal data:", error);
      res.status(500).json({ message: "Failed to fetch donor portal data" });
    }
  });

  // Update donor contact info (public route - token-based auth)
  // Simple rate limiting for donor portal updates
  const donorPortalRateLimits = new Map<string, { count: number; resetTime: number }>();
  
  app.patch('/api/donor-portal/update-contact/:token', async (req: any, res) => {
    try {
      const token = req.params.token;
      
      // Rate limiting: max 5 updates per hour per token
      const now = Date.now();
      const rateLimit = donorPortalRateLimits.get(token);
      if (rateLimit) {
        if (now < rateLimit.resetTime) {
          if (rateLimit.count >= 5) {
            return res.status(429).json({ message: "Too many requests. Please try again later." });
          }
          rateLimit.count++;
        } else {
          donorPortalRateLimits.set(token, { count: 1, resetTime: now + 3600000 });
        }
      } else {
        donorPortalRateLimits.set(token, { count: 1, resetTime: now + 3600000 });
      }
      
      const result = await storage.getDonorByAccessToken(token);
      if (!result) {
        return res.status(401).json({ message: "Invalid or expired access token" });
      }
      
      // Schema validation for contact updates - only allow specific fields
      const { email, phone, address } = req.body;
      const updates: { email?: string; phone?: string; address?: string } = {};
      
      // Validate email format if provided
      if (email !== undefined) {
        if (typeof email !== 'string' || (email.length > 0 && !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/))) {
          return res.status(400).json({ message: "Invalid email format" });
        }
        updates.email = email.trim().slice(0, 255);
      }
      
      // Validate phone if provided
      if (phone !== undefined) {
        if (typeof phone !== 'string') {
          return res.status(400).json({ message: "Invalid phone format" });
        }
        updates.phone = phone.trim().slice(0, 50);
      }
      
      // Validate address if provided
      if (address !== undefined) {
        if (typeof address !== 'string') {
          return res.status(400).json({ message: "Invalid address format" });
        }
        updates.address = address.trim().slice(0, 500);
      }
      
      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ message: "No valid fields to update" });
      }
      
      const updatedDonor = await storage.updateDonor(result.donor.id, updates);
      
      res.json({ 
        success: true, 
        donor: {
          id: updatedDonor.id,
          name: updatedDonor.name,
          email: updatedDonor.email,
          phone: updatedDonor.phone,
          address: updatedDonor.address,
        }
      });
    } catch (error) {
      console.error("Error updating donor contact:", error);
      res.status(500).json({ message: "Failed to update contact information" });
    }
  });

  // Donor Letter routes
  app.get('/api/donor-letters/:organizationId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);
      
      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      const organization = await storage.getOrganization(organizationId);
      if (!organization || organization.type !== 'nonprofit') {
        return res.status(403).json({ message: "Donor letters are only available for nonprofit organizations" });
      }

      const letters = await storage.getDonorLetters(organizationId);
      res.json({ data: letters });
    } catch (error) {
      console.error("Error fetching donor letters:", error);
      res.status(500).json({ message: "Failed to fetch donor letters" });
    }
  });

  app.post('/api/donor-letters', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const data = req.body;
      
      const userRole = await storage.getUserRole(userId, data.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      const organization = await storage.getOrganization(data.organizationId);
      if (!organization || organization.type !== 'nonprofit') {
        return res.status(403).json({ message: "Donor letters are only available for nonprofit organizations" });
      }
      
      if (!hasPermission(userRole.role, userRole.permissions, 'edit_transactions')) {
        return res.status(403).json({ message: "You don't have permission to create donor letters" });
      }

      const letter = await storage.createDonorLetter(data, userId);
      res.status(201).json({ data: letter });
    } catch (error) {
      console.error("Error creating donor letter:", error);
      res.status(500).json({ message: "Failed to create donor letter" });
    }
  });

  app.post('/api/donor-letters/:id/finalize', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const letterId = parseInt(req.params.id);
      const { renderedHtml } = req.body;

      if (!renderedHtml) {
        return res.status(400).json({ message: "Rendered HTML is required" });
      }

      const letter = await storage.getDonorLetter(letterId);
      if (!letter) {
        return res.status(404).json({ message: "Letter not found" });
      }

      const userRole = await storage.getUserRole(userId, letter.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied" });
      }

      const organization = await storage.getOrganization(letter.organizationId);
      if (!organization || organization.type !== 'nonprofit') {
        return res.status(403).json({ message: "Donor letters are only available for nonprofit organizations" });
      }
      
      if (!hasPermission(userRole.role, userRole.permissions, 'edit_transactions')) {
        return res.status(403).json({ message: "You don't have permission to finalize donor letters" });
      }

      if (letter.letterStatus !== 'draft') {
        return res.status(400).json({ message: "Only draft letters can be finalized" });
      }

      const finalizedLetter = await storage.finalizeDonorLetter(letterId, renderedHtml);
      res.json({ data: finalizedLetter });
    } catch (error) {
      console.error("Error finalizing donor letter:", error);
      res.status(500).json({ message: "Failed to finalize donor letter" });
    }
  });

  // Email donation letter to donor
  app.post('/api/donor-letters/:id/email', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const letterId = parseInt(req.params.id);

      const letter = await storage.getDonorLetter(letterId);
      if (!letter) {
        return res.status(404).json({ message: "Letter not found" });
      }

      const userRole = await storage.getUserRole(userId, letter.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied" });
      }

      const organization = await storage.getOrganization(letter.organizationId);
      if (!organization || organization.type !== 'nonprofit') {
        return res.status(403).json({ message: "Donor letters are only available for nonprofit organizations" });
      }
      
      if (!hasPermission(userRole.role, userRole.permissions, 'edit_transactions')) {
        return res.status(403).json({ message: "You don't have permission to email donor letters" });
      }

      // Only finalized letters can be emailed
      if (letter.letterStatus !== 'finalized' && letter.letterStatus !== 'sent') {
        return res.status(400).json({ message: "Only finalized letters can be emailed" });
      }

      // Get the donor
      const donor = await storage.getDonor(letter.donorId);
      if (!donor) {
        return res.status(404).json({ message: "Donor not found" });
      }

      if (!donor.email) {
        return res.status(400).json({ message: "Donor does not have an email address" });
      }

      // Format the donation amount
      const formattedAmount = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(parseFloat(letter.donationAmount));

      // Get the base URL for logo
      const baseUrl = process.env.REPLIT_DOMAINS 
        ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
        : 'http://localhost:5000';

      // Send the email
      await sendDonationLetterEmail({
        to: donor.email,
        donorName: donor.name,
        organizationName: organization.companyName || organization.name,
        year: letter.year,
        donationAmount: formattedAmount,
        letterHtml: letter.renderedHtml || '',
        branding: {
          primaryColor: organization.invoicePrimaryColor || undefined,
          accentColor: organization.invoiceAccentColor || undefined,
          fontFamily: organization.invoiceFontFamily || undefined,
          logoUrl: organization.logoUrl ? `${baseUrl}${organization.logoUrl}` : undefined,
          footer: organization.invoiceFooter || undefined,
        }
      });

      // Update letter status to 'sent' and track delivery info
      const updatedLetter = await storage.updateDonorLetterDelivery(letterId, {
        letterStatus: 'sent',
        deliveryMode: 'email',
        deliveryRef: donor.email,
      });

      res.json({ data: updatedLetter, message: "Email sent successfully" });
    } catch (error) {
      console.error("Error emailing donor letter:", error);
      res.status(500).json({ message: "Failed to send donor letter email" });
    }
  });

  app.delete('/api/donor-letters/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const letterId = parseInt(req.params.id);
      
      const letter = await storage.getDonorLetter(letterId);
      if (!letter) {
        return res.status(404).json({ message: "Letter not found" });
      }
      
      const userRole = await storage.getUserRole(userId, letter.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied" });
      }

      const organization = await storage.getOrganization(letter.organizationId);
      if (!organization || organization.type !== 'nonprofit') {
        return res.status(403).json({ message: "Donor letters are only available for nonprofit organizations" });
      }
      
      if (!hasPermission(userRole.role, userRole.permissions, 'edit_transactions')) {
        return res.status(403).json({ message: "You don't have permission to delete donor letters" });
      }

      // Only allow deletion of draft letters
      if (letter.letterStatus !== 'draft') {
        return res.status(400).json({ message: "Only draft letters can be deleted" });
      }

      await storage.deleteDonorLetter(letterId);
      res.status(200).json({ message: "Donor letter deleted successfully" });
    } catch (error) {
      console.error("Error deleting donor letter:", error);
      res.status(500).json({ message: "Failed to delete donor letter" });
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
      res.json({ data: donationData });
    } catch (error) {
      console.error("Error fetching donation data:", error);
      res.status(500).json({ message: "Failed to fetch donation data" });
    }
  });

  // Team routes
  app.get('/api/teams/:organizationId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);
      
      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      const teams = await storage.getTeams(organizationId);
      res.json(teams);
    } catch (error) {
      console.error("Error fetching teams:", error);
      res.status(500).json({ message: "Failed to fetch teams" });
    }
  });

  app.post('/api/teams', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { organizationId, ...teamData } = req.body;
      
      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole || !['owner', 'admin'].includes(userRole.role)) {
        return res.status(403).json({ message: "Only owners and admins can create teams" });
      }

      const team = await storage.createTeam({ organizationId, ...teamData });
      res.status(201).json(team);
    } catch (error) {
      console.error("Error creating team:", error);
      res.status(500).json({ message: "Failed to create team" });
    }
  });

  app.patch('/api/teams/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const teamId = parseInt(req.params.id);
      
      const team = await storage.getTeam(teamId);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }

      const userRole = await storage.getUserRole(userId, team.organizationId);
      if (!userRole || !['owner', 'admin'].includes(userRole.role)) {
        return res.status(403).json({ message: "Only owners and admins can update teams" });
      }

      const updatedTeam = await storage.updateTeam(teamId, req.body);
      res.json(updatedTeam);
    } catch (error) {
      console.error("Error updating team:", error);
      res.status(500).json({ message: "Failed to update team" });
    }
  });

  app.delete('/api/teams/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const teamId = parseInt(req.params.id);
      
      const team = await storage.getTeam(teamId);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }

      const userRole = await storage.getUserRole(userId, team.organizationId);
      if (!userRole || !['owner', 'admin'].includes(userRole.role)) {
        return res.status(403).json({ message: "Only owners and admins can delete teams" });
      }

      await storage.deleteTeam(teamId);
      res.json({ message: "Team deleted successfully" });
    } catch (error) {
      console.error("Error deleting team:", error);
      res.status(500).json({ message: "Failed to delete team" });
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
      
      // Convert date strings to Date objects before validation
      const body = {
        ...req.body,
        hireDate: req.body.hireDate ? new Date(req.body.hireDate) : undefined,
        terminationDate: req.body.terminationDate ? new Date(req.body.terminationDate) : undefined,
      };
      
      const data = insertEmployeeSchema.parse(body);
      
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
      
      // Convert date strings to Date objects before validation
      const body = {
        ...req.body,
        payPeriodStart: req.body.payPeriodStart ? new Date(req.body.payPeriodStart) : undefined,
        payPeriodEnd: req.body.payPeriodEnd ? new Date(req.body.payPeriodEnd) : undefined,
        payDate: req.body.payDate ? new Date(req.body.payDate) : undefined,
      };
      
      const data = insertPayrollRunSchema.parse(body);
      
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

      // Check if pagination is requested
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
      const search = req.query.search as string | undefined;
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;

      if (limit !== undefined) {
        // Paginated response
        const result = await storage.getTransactionsPaginated(organizationId, { limit, offset, search, startDate, endDate });
        res.json(result);
      } else {
        // Legacy: return all transactions (for backwards compatibility)
        const transactions = await storage.getTransactions(organizationId);
        res.json(transactions);
      }
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

      // Server-side grant overspending validation
      if (data.grantId && data.type === 'expense') {
        const grantsWithSpent = await storage.getGrants(data.organizationId);
        const grant = grantsWithSpent.find(g => g.id === data.grantId);
        if (grant) {
          const remaining = parseFloat(grant.remainingBalance);
          const expenseAmount = parseFloat(data.amount);
          if (expenseAmount > remaining) {
            return res.status(400).json({ 
              message: `Grant balance exceeded. This expense ($${expenseAmount.toFixed(2)}) exceeds the remaining grant balance ($${remaining.toFixed(2)}).` 
            });
          }
        }
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

      // Server-side grant overspending validation for updates
      const newGrantId = updates.grantId !== undefined ? updates.grantId : existingTransaction.grantId;
      const newType = updates.type !== undefined ? updates.type : existingTransaction.type;
      const newAmount = updates.amount !== undefined ? updates.amount : existingTransaction.amount;
      
      if (newGrantId && newType === 'expense') {
        const grantsWithSpent = await storage.getGrants(existingTransaction.organizationId);
        const grant = grantsWithSpent.find(g => g.id === newGrantId);
        if (grant) {
          let remaining = parseFloat(grant.remainingBalance);
          // Add back the current transaction's amount if it was already assigned to this grant
          if (existingTransaction.grantId === newGrantId && existingTransaction.type === 'expense') {
            remaining += parseFloat(existingTransaction.amount);
          }
          const expenseAmount = parseFloat(newAmount);
          if (expenseAmount > remaining) {
            return res.status(400).json({ 
              message: `Grant balance exceeded. This expense ($${expenseAmount.toFixed(2)}) exceeds the remaining grant balance ($${remaining.toFixed(2)}).` 
            });
          }
        }
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

  // Split Transaction
  app.post('/api/transactions/:id/split', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const transactionId = parseInt(req.params.id);
      const { splits } = req.body;

      if (!Array.isArray(splits) || splits.length < 2) {
        return res.status(400).json({ message: "At least 2 splits are required" });
      }

      for (const split of splits) {
        const amount = parseFloat(split.amount);
        if (isNaN(amount) || amount <= 0) {
          return res.status(400).json({ message: "All split amounts must be positive numbers" });
        }
      }

      const existingTransaction = await storage.getTransaction(transactionId);
      if (!existingTransaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }

      const totalSplitAmount = splits.reduce((sum: number, s: any) => sum + parseFloat(s.amount), 0);
      const originalAmount = parseFloat(existingTransaction.amount);
      if (Math.abs(totalSplitAmount - originalAmount) > 0.01) {
        return res.status(400).json({ 
          message: `Split amounts must equal original amount. Got ${totalSplitAmount.toFixed(2)}, expected ${originalAmount.toFixed(2)}` 
        });
      }

      const userRole = await storage.getUserRole(userId, existingTransaction.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }
      
      if (!hasPermission(userRole.role, userRole.permissions, 'edit_transactions')) {
        return res.status(403).json({ message: "You don't have permission to edit transactions" });
      }

      // Server-side grant overspending validation for splits
      if (existingTransaction.type === 'expense') {
        const grantsWithSpent = await storage.getGrants(existingTransaction.organizationId);
        
        // Calculate total allocation per grant from all splits
        const grantAllocations = new Map<number, number>();
        for (const split of splits) {
          if (split.grantId) {
            const grantId = typeof split.grantId === 'string' ? parseInt(split.grantId) : split.grantId;
            const current = grantAllocations.get(grantId) || 0;
            grantAllocations.set(grantId, current + parseFloat(split.amount));
          }
        }
        
        // Check each grant allocation against remaining balance
        for (const [grantId, allocated] of Array.from(grantAllocations.entries())) {
          const grant = grantsWithSpent.find(g => g.id === grantId);
          if (grant) {
            let remaining = parseFloat(grant.remainingBalance);
            // Add back what was previously allocated to this grant from the original transaction
            if (existingTransaction.grantId === grantId) {
              remaining += parseFloat(existingTransaction.amount);
            }
            if (allocated > remaining) {
              return res.status(400).json({ 
                message: `Grant "${grant.name}" balance exceeded. Split allocates $${allocated.toFixed(2)} but only $${remaining.toFixed(2)} remains.` 
              });
            }
          }
        }
      }

      const createdSplits = await storage.splitTransaction(transactionId, splits, userId);
      
      await storage.logUpdate(existingTransaction.organizationId, userId, 'transaction', transactionId.toString(), existingTransaction, { action: 'split', splitCount: createdSplits.length });
      
      res.json({ message: "Transaction split successfully", splits: createdSplits });
    } catch (error: any) {
      console.error("Error splitting transaction:", error);
      res.status(400).json({ message: error.message || "Failed to split transaction" });
    }
  });

  // Get Transaction Splits
  app.get('/api/transactions/:id/splits', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const transactionId = parseInt(req.params.id);

      const existingTransaction = await storage.getTransaction(transactionId);
      if (!existingTransaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }

      const userRole = await storage.getUserRole(userId, existingTransaction.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      const splits = await storage.getTransactionSplits(transactionId);
      res.json(splits);
    } catch (error) {
      console.error("Error getting transaction splits:", error);
      res.status(500).json({ message: "Failed to get transaction splits" });
    }
  });

  // Unsplit Transaction (restore to original)
  app.post('/api/transactions/:id/unsplit', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const transactionId = parseInt(req.params.id);

      const existingTransaction = await storage.getTransaction(transactionId);
      if (!existingTransaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }

      const userRole = await storage.getUserRole(userId, existingTransaction.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }
      
      if (!hasPermission(userRole.role, userRole.permissions, 'edit_transactions')) {
        return res.status(403).json({ message: "You don't have permission to edit transactions" });
      }

      const restoredTransaction = await storage.unsplitTransaction(transactionId);
      
      await storage.logUpdate(existingTransaction.organizationId, userId, 'transaction', transactionId.toString(), existingTransaction, { action: 'unsplit' });
      
      res.json({ message: "Transaction unsplit successfully", transaction: restoredTransaction });
    } catch (error: any) {
      console.error("Error unsplitting transaction:", error);
      res.status(400).json({ message: error.message || "Failed to unsplit transaction" });
    }
  });

  // Bulk Operations for Transactions
  app.post('/api/transactions/bulk-categorize', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { transactionIds, categoryId, fundId, programId, grantId, functionalCategory } = req.body;

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
      if (grantId !== undefined) updates.grantId = grantId;
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

  // Configure multer for PDF uploads
  const pdfUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
      if (file.mimetype === 'application/pdf' || file.originalname.endsWith('.pdf')) {
        cb(null, true);
      } else {
        cb(new Error('Only PDF files are allowed'));
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

      let logoPath: string;

      if (isReplitEnvironment) {
        // Use Replit Object Storage
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
        logoPath = await objectStorageService.trySetObjectEntityAclPolicy(rawPath, {
          owner: userId,
          visibility: 'public',
        });
      } else {
        // Fallback: Save to local filesystem for non-Replit environments (e.g., Render)
        const uploadsDir = path.join(process.cwd(), 'uploads', 'logos');
        
        // Ensure uploads directory exists
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }

        // Generate unique filename
        const fileExt = path.extname(req.file.originalname) || '.png';
        const fileName = `org_${organizationId}_${Date.now()}${fileExt}`;
        const filePath = path.join(uploadsDir, fileName);

        // Write file to disk
        fs.writeFileSync(filePath, req.file.buffer);

        // Return the relative URL path that will be served
        logoPath = `/uploads/logos/${fileName}`;
      }
      
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
      
      console.log('[CSV Import] Starting import for organization:', organizationId);

      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        console.log('[CSV Import] Access denied - no user role');
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      if (!hasPermission(userRole.role, userRole.permissions, 'edit_transactions')) {
        console.log('[CSV Import] Permission denied');
        return res.status(403).json({ message: "You don't have permission to import transactions" });
      }

      if (!req.file) {
        console.log('[CSV Import] No file uploaded');
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      console.log('[CSV Import] File received:', req.file.originalname, 'Size:', req.file.size);

      // Parse CSV - handle both header rows and data rows
      let csvContent = req.file.buffer.toString('utf-8');
      
      // Remove BOM if present
      csvContent = csvContent.replace(/^\uFEFF/, '');
      
      // Find the header row (look for common column headers)
      const lines = csvContent.split('\n');
      let headerRowIndex = -1;
      for (let i = 0; i < Math.min(lines.length, 10); i++) {
        const line = lines[i].toUpperCase();
        if ((line.includes('DATE') || line.includes('DESCRIPTION')) && 
            (line.includes('AMOUNT') || line.includes('DEBIT') || line.includes('CREDIT'))) {
          headerRowIndex = i;
          break;
        }
      }

      // If we found a header row after the first line, skip everything before it
      if (headerRowIndex > 0) {
        csvContent = lines.slice(headerRowIndex).join('\n');
      }

      const parseResult = Papa.parse(csvContent, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: false // Keep as strings to preserve formatting
      });

      if (parseResult.errors.length > 0) {
        console.error("CSV parsing errors:", parseResult.errors);
        return res.status(400).json({ 
          message: "CSV parsing errors", 
          errors: parseResult.errors 
        });
      }

      console.log('[CSV Import] Parsed', parseResult.data.length, 'rows');
      console.log('[CSV Import] Column headers:', Object.keys(parseResult.data[0] || {}));

      // Validate and create transactions
      const created = [];
      const errors = [];
      const skipped = [];

      for (let i = 0; i < parseResult.data.length; i++) {
        const row: any = parseResult.data[i];
        
        try {
          // For double-entry formats, only import Cash/Bank account transactions to avoid duplicates
          const accountName = String(row['Account Name'] || row.account || row.Account || '').trim();
          if (accountName && !accountName.toLowerCase().includes('cash') && !accountName.toLowerCase().includes('bank') && !accountName.toLowerCase().includes('checking')) {
            skipped.push({ row: i + 1, reason: 'Non-cash account (double-entry format)' });
            continue;
          }
          
          // Skip rows that are clearly not transactions (e.g., "Starting Balance" rows)
          const desc = String(row.description || row.Description || row.DESCRIPTION || 
                             row['Transaction Description'] || row['Transaction Line Description'] || 
                             row['Notes / Memo'] || '').trim();
          if (desc.toLowerCase().includes('starting balance') || desc.toLowerCase().includes('ending balance')) {
            skipped.push({ row: i + 1, reason: 'Balance row' });
            continue;
          }

          // Handle DEBIT/CREDIT columns (common in accounting exports)
          let rawAmount = '';
          let transactionType: 'income' | 'expense' = 'expense';
          
          // Check for debit/credit columns (case-insensitive, with variations)
          const debitCol = row.debit || row.Debit || row.DEBIT || 
                          row['DEBIT (In Business Currency)'] || 
                          row['Debit Amount (Two Column Approach)'] || '';
          const creditCol = row.credit || row.Credit || row.CREDIT || 
                           row['CREDIT (In Business Currency)'] || 
                           row['Credit Amount (Two Column Approach)'] || '';
          
          if (debitCol || creditCol) {
            // CSV uses DEBIT/CREDIT format
            if (debitCol && debitCol !== '') {
              rawAmount = String(debitCol);
              transactionType = 'income'; // Debits increase cash (income/deposits)
            } else if (creditCol && creditCol !== '') {
              rawAmount = String(creditCol);
              transactionType = 'expense'; // Credits decrease cash (expenses/withdrawals)
            } else {
              // Both empty, skip this row
              skipped.push({ row: i + 1, reason: 'No amount' });
              continue;
            }
          } else {
            // CSV uses single amount column
            rawAmount = row.amount || row.Amount || row.AMOUNT || '0';
            const amountStr = String(rawAmount);
            // Handle parentheses format like ($549.57) which indicates negative/expense
            const hasParentheses = amountStr.includes('(') && amountStr.includes(')');
            const hasNegativeSign = amountStr.includes('-') || hasParentheses;
            
            // Determine transaction type from type column or amount sign
            const rawType = (row.type || row.Type || row.TYPE || '').toString().toLowerCase().trim();
            
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
                transactionType = hasNegativeSign ? 'expense' : 'income';
              } else {
                transactionType = hasNegativeSign ? 'expense' : 'income';
              }
            }
          }

          // Clean amount: remove currency symbols, commas, parentheses, and convert to number
          const cleanAmount = String(rawAmount).replace(/[$,\-\(\)]/g, '').trim();
          const parsedAmount = parseFloat(cleanAmount);
          const validAmount = isNaN(parsedAmount) ? 0 : Math.abs(parsedAmount);

          // Skip if amount is 0 or invalid
          if (validAmount === 0) {
            skipped.push({ row: i + 1, reason: 'Zero amount' });
            continue;
          }

          // Parse date from various column names
          const rawDate = row.date || row.Date || row.DATE || 
                         row['Transaction Date'] || row.transactionDate || '';
          let parsedDate = '';
          
          if (rawDate) {
            try {
              // Handle various date formats
              const dateObj = new Date(rawDate);
              if (!isNaN(dateObj.getTime())) {
                parsedDate = dateObj.toISOString().split('T')[0];
              } else {
                parsedDate = new Date().toISOString().split('T')[0];
              }
            } catch {
              parsedDate = new Date().toISOString().split('T')[0];
            }
          } else {
            parsedDate = new Date().toISOString().split('T')[0];
          }

          // Check for duplicate transaction before creating
          // Match by date, amount, type, and similar description (to avoid duplicating Plaid imports)
          const searchDesc = desc || 'Imported transaction';
          console.log(`[QUICKBOOKS Import] Row ${i + 1}: Checking for duplicate - Date: ${parsedDate}, Amount: ${validAmount.toFixed(2)}, Type: ${transactionType}, Desc: "${searchDesc.substring(0, 30)}..."`);
          
          const existingMatch = await storage.findAnyMatchingTransaction(
            organizationId,
            new Date(parsedDate),
            validAmount.toFixed(2),
            searchDesc,
            transactionType
          );

          if (existingMatch) {
            console.log(`[QUICKBOOKS Import] Row ${i + 1}: SKIPPED - Matches existing #${existingMatch.id} ("${existingMatch.description.substring(0, 30)}...")`);
            skipped.push({ row: i + 1, reason: `Duplicate: matches existing transaction #${existingMatch.id}` });
            continue;
          }

          // Map CSV columns to transaction schema
          const transactionData = {
            organizationId,
            createdBy: userId,
            date: parsedDate,
            type: transactionType,
            amount: validAmount,
            description: desc || 'Imported transaction',
            categoryId: row.categoryId || row.CategoryId || null,
            vendorId: row.vendorId || row.VendorId || null,
            clientId: row.clientId || row.ClientId || null,
            fundId: row.fundId || row.FundId || null,
            programId: row.programId || row.ProgramId || null,
            functionalCategory: row.functionalCategory || row.FunctionalCategory || null,
            source: 'manual' as const,
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
        { imported: created.length, errors: errors.length, skipped: skipped.length, totalRows: parseResult.data.length }
      );

      console.log('[CSV Import] Complete -', 'Created:', created.length, 'Skipped:', skipped.length, 'Errors:', errors.length);
      if (skipped.length > 0) {
        console.log('[CSV Import] Skipped reasons:', skipped.slice(0, 10));
      }
      if (errors.length > 0) {
        console.log('[CSV Import] First errors:', errors.slice(0, 5));
      }

      res.json({
        message: `Import complete: ${created.length} transactions created, ${skipped.length} skipped, ${errors.length} errors`,
        created,
        errors,
        skipped,
        summary: {
          total: parseResult.data.length,
          success: created.length,
          skipped: skipped.length,
          failed: errors.length
        }
      });
    } catch (error) {
      console.error("Error importing CSV:", error);
      res.status(500).json({ message: "Failed to import CSV" });
    }
  });

  // QuickBooks/Xero Import endpoint
  app.post('/api/transactions/import-accounting/:organizationId', isAuthenticated, upload.single('file'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);
      const source = (req.query.source || 'quickbooks') as 'quickbooks' | 'xero';
      
      console.log(`[${source.toUpperCase()} Import] Starting import for organization:`, organizationId);

      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        console.log(`[${source.toUpperCase()} Import] Access denied - no user role`);
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      if (!hasPermission(userRole.role, userRole.permissions, 'edit_transactions')) {
        console.log(`[${source.toUpperCase()} Import] Permission denied`);
        return res.status(403).json({ message: "You don't have permission to import transactions" });
      }

      if (!req.file) {
        console.log(`[${source.toUpperCase()} Import] No file uploaded`);
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      console.log(`[${source.toUpperCase()} Import] File received:`, req.file.originalname, 'Size:', req.file.size);

      // Parse CSV
      let csvContent = req.file.buffer.toString('utf-8');
      csvContent = csvContent.replace(/^\uFEFF/, ''); // Remove BOM

      // Find header row
      const lines = csvContent.split('\n');
      let headerRowIndex = -1;
      for (let i = 0; i < Math.min(lines.length, 10); i++) {
        const line = lines[i].toUpperCase();
        if ((line.includes('DATE') || line.includes('*DATE')) && 
            (line.includes('AMOUNT') || line.includes('*AMOUNT') || line.includes('DEBIT') || line.includes('CREDIT'))) {
          headerRowIndex = i;
          break;
        }
      }

      if (headerRowIndex > 0) {
        csvContent = lines.slice(headerRowIndex).join('\n');
      }

      const parseResult = Papa.parse(csvContent, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: false
      });

      if (parseResult.errors.length > 0) {
        console.error(`${source.toUpperCase()} parsing errors:`, parseResult.errors);
        return res.status(400).json({ 
          message: "CSV parsing errors", 
          errors: parseResult.errors 
        });
      }

      console.log(`[${source.toUpperCase()} Import] Parsed`, parseResult.data.length, 'rows');
      console.log(`[${source.toUpperCase()} Import] Column headers:`, Object.keys(parseResult.data[0] || {}));

      // Get existing vendors and categories for matching
      const vendors = await storage.getVendors(organizationId);
      const categories = await storage.getCategories(organizationId);

      const created = [];
      const errors = [];
      const skipped = [];

      for (let i = 0; i < parseResult.data.length; i++) {
        const row: any = parseResult.data[i];
        
        try {
          let rawAmount = '';
          let transactionType: 'income' | 'expense' = 'expense';
          let description = '';
          let rawDate = '';
          let payeeName = '';
          let accountInfo = '';

          if (source === 'quickbooks') {
            // Detect Wave Journal format: has "Transaction ID" and "Account Type" columns
            // This is a double-entry format where each transaction has 2 rows
            const isWaveJournalFormat = Object.keys(row).some(key => 
              key.toUpperCase().trim() === 'TRANSACTION ID'
            ) && Object.keys(row).some(key => 
              key.toUpperCase().trim() === 'ACCOUNT TYPE'
            );
            
            // Detect Wave Apps Account Transactions format: has "ACCOUNT NUMBER" column or columns with "(In Business Currency)" suffix
            const isWaveAppsFormat = !isWaveJournalFormat && Object.keys(row).some(key => {
              const keyUpper = key.toUpperCase().trim();
              return keyUpper === 'ACCOUNT NUMBER' || 
                     keyUpper.includes('ACCOUNT NUMBER') ||
                     keyUpper.includes('IN BUSINESS CURRENCY');
            });
            
            if (isWaveJournalFormat) {
              // Wave Journal Export format (double-entry):
              // Each transaction has 2 rows - one for bank account, one for expense/income account
              // We only want to import rows where Account Type = "Cash and Bank"
              
              const accountType = (row['Account Type'] || '').trim();
              const accountGroup = (row['Account Group'] || '').trim();
              
              // Only process bank account rows (skip the corresponding expense/income rows)
              if (accountType !== 'Cash and Bank') {
                // Skip this row - it's the journal entry counterpart
                continue;
              }
              
              // Skip beginning balance entries
              const transactionDesc = (row['Transaction Description'] || '').toLowerCase();
              if (transactionDesc.includes('beginning balance') || transactionDesc.includes('begining balance')) {
                skipped.push(`Row ${i + 1}: Beginning balance entry`);
                continue;
              }
              
              rawDate = row['Transaction Date'] || '';
              description = row['Transaction Description'] || row['Transaction Line Description'] || '';
              payeeName = row['Customer'] || row['Vendor'] || '';
              accountInfo = row['Other Accounts for this Transaction'] || ''; // This is the category name
              
              // Use "Amount (One column)" - negative = expense, positive = income
              const amountOneCol = row['Amount (One column)'] || row['Amount'] || '';
              const cleanAmount = String(amountOneCol).replace(/[$,\s]/g, '').trim();
              const amountNum = parseFloat(cleanAmount) || 0;
              
              if (amountNum === 0) {
                skipped.push(`Row ${i + 1}: Zero amount`);
                continue;
              }
              
              // Negative amount = money out = expense, Positive = money in = income
              if (amountNum < 0) {
                rawAmount = String(Math.abs(amountNum));
                transactionType = 'expense';
              } else {
                rawAmount = String(amountNum);
                transactionType = 'income';
              }
            } else if (isWaveAppsFormat) {
              // Wave Apps format: 
              // Column A: ACCOUNT NUMBER (e.g., "Checking")
              // Column B: DATE
              // Column C: DESCRIPTION
              // Column D: DEBIT (In Business Currency) → expense
              // Column E: CREDIT (In Business Currency) → income  
              // Column F: BALANCE (In Business Currency) → IGNORE completely
              
              let dateVal = '';
              let descVal = '';
              let debitVal = '';
              let creditVal = '';
              
              for (const key of Object.keys(row)) {
                const keyUpper = key.toUpperCase().trim();
                
                // Get DATE column (but not if it's part of account name)
                if ((keyUpper === 'DATE' || keyUpper.includes('DATE')) && !keyUpper.includes('ACCOUNT')) {
                  dateVal = row[key] || '';
                }
                
                // Get DESCRIPTION column
                if (keyUpper === 'DESCRIPTION' || keyUpper.includes('DESCRIPTION')) {
                  descVal = row[key] || '';
                }
                
                // Get DEBIT column - but NOT BALANCE
                if (keyUpper.includes('DEBIT') && !keyUpper.includes('BALANCE')) {
                  debitVal = row[key] || '';
                }
                
                // Get CREDIT column - but NOT BALANCE
                if (keyUpper.includes('CREDIT') && !keyUpper.includes('BALANCE')) {
                  creditVal = row[key] || '';
                }
              }
              
              rawDate = dateVal;
              description = descVal;
              payeeName = ''; // Wave Apps doesn't have a separate payee column
              accountInfo = ''; // Leave category blank as requested
              
              // Skip metadata rows (Wave Apps format) - be more aggressive
              const descLower = description.toLowerCase().trim();
              const accountNumber = (row['ACCOUNT NUMBER'] || row['Account Number'] || '').toLowerCase().trim();
              
              // Stop processing when we hit end-of-section markers
              if (descLower.includes('totals and ending balance') || 
                  descLower.includes('balance change') ||
                  descLower === 'totals' ||
                  descLower.includes('ending balance')) {
                console.log(`[Wave Import] Stopping at end-of-section marker: "${description}"`);
                break; // Stop processing - everything after this is a different section
              }
              
              // Skip rows that indicate a new section (e.g., "Transfer Clearing", empty first col with section name)
              if (accountNumber === '' && description.toLowerCase().includes('clearing')) {
                console.log(`[Wave Import] Stopping at section: "${description}"`);
                break;
              }
              
              // Skip other metadata rows
              if (descLower.includes('starting balance') || 
                  accountNumber.includes('starting balance') ||
                  description.trim() === '') {
                skipped.push(`Row ${i + 1}: Metadata row (${description || 'Empty description'})`);
                continue;
              }
              
              // Clean the debit/credit values
              const cleanDebit = String(debitVal).replace(/[$,\s]/g, '').trim();
              const cleanCredit = String(creditVal).replace(/[$,\s]/g, '').trim();
              const debitNum = parseFloat(cleanDebit) || 0;
              const creditNum = parseFloat(cleanCredit) || 0;
              
              // Wave Apps bank account perspective:
              // DEBIT = money coming INTO the bank account = INCOME
              // CREDIT = money going OUT of the bank account = EXPENSE
              // Create ONE transaction per row (only debit OR credit should have a value)
              if (debitNum > 0 && creditNum === 0) {
                rawAmount = cleanDebit;
                transactionType = 'income'; // DEBIT to bank = money received
              } else if (creditNum > 0 && debitNum === 0) {
                rawAmount = cleanCredit;
                transactionType = 'expense'; // CREDIT to bank = money paid out
              } else if (debitNum > 0 && creditNum > 0) {
                // Both have values - unusual, net them
                if (debitNum > creditNum) {
                  rawAmount = String(debitNum - creditNum);
                  transactionType = 'income';
                } else {
                  rawAmount = String(creditNum - debitNum);
                  transactionType = 'expense';
                }
              } else {
                skipped.push(`Row ${i + 1}: No debit or credit amount`);
                continue;
              }
            } else {
              // Standard QuickBooks column mapping
              rawDate = row['Date'] || row['date'] || row['DATE'] || row['Transaction Date'] || '';
              description = row['Memo/Description'] || row['Memo'] || row['Description'] || row['DESCRIPTION'] || row['Memo/Desc'] || '';
              payeeName = row['Name'] || row['Payee'] || row['Customer/Vendor'] || '';
              accountInfo = row['Split'] || row['Account'] || row['Category'] || row['ACCOUNT NUMBER'] || '';
              
              // Skip metadata rows (Wave Apps format)
              const descLower = description.toLowerCase();
              if (descLower.includes('starting balance') || 
                  descLower.includes('totals and ending balance') || 
                  descLower.includes('balance change') ||
                  descLower === '' && (row['ACCOUNT NUMBER'] || '').includes('Starting Balance')) {
                skipped.push(`Row ${i + 1}: Metadata row (${description || 'Starting Balance'})`);
                continue;
              }
              
              // Find debit/credit columns - support Wave Apps format with "(In Business Currency)" suffix
              let debitCol = '';
              let creditCol = '';
              
              // Check for exact matches first
              debitCol = row['Debit'] || row['debit'] || row['DEBIT'] || '';
              creditCol = row['Credit'] || row['credit'] || row['CREDIT'] || '';
              
              // If not found, look for columns with partial matches (Wave Apps format)
              if (!debitCol && !creditCol) {
                for (const key of Object.keys(row)) {
                  const keyUpper = key.toUpperCase();
                  if (keyUpper.includes('DEBIT') && !debitCol) {
                    debitCol = row[key] || '';
                  }
                  if (keyUpper.includes('CREDIT') && !creditCol) {
                    creditCol = row[key] || '';
                  }
                }
              }
              
              if (debitCol && debitCol !== '') {
                rawAmount = String(debitCol);
                transactionType = 'expense'; // Debit in QB typically = expense from bank perspective
              } else if (creditCol && creditCol !== '') {
                rawAmount = String(creditCol);
                transactionType = 'income'; // Credit in QB typically = deposit
              } else {
                // Single amount column
                rawAmount = row['Amount'] || row['amount'] || '0';
                const hasNegativeSign = String(rawAmount).includes('-');
                transactionType = hasNegativeSign ? 'expense' : 'income';
              }
            }
          } else {
            // Xero column mapping
            rawDate = row['*Date'] || row['Date'] || row['date'] || '';
            description = row['Description'] || row['description'] || row['Particulars'] || '';
            payeeName = row['Payee'] || row['payee'] || row['Contact'] || row['Name'] || '';
            accountInfo = row['Account Code'] || row['Account'] || row['account_code'] || '';
            
            // Xero uses signed amounts (positive = income, negative = expense)
            rawAmount = row['*Amount'] || row['Amount'] || row['amount'] || '0';
            const numericAmount = parseFloat(String(rawAmount).replace(/[$,]/g, ''));
            transactionType = numericAmount >= 0 ? 'income' : 'expense';
          }

          // Skip empty rows
          if (!rawDate && !rawAmount) {
            skipped.push(`Row ${i + 1}: Empty row`);
            continue;
          }

          // Clean and parse amount - handle parentheses as negative (e.g., "($549.57)")
          const rawAmountStr = String(rawAmount).trim();
          const hasParentheses = rawAmountStr.includes('(') && rawAmountStr.includes(')');
          const cleanAmount = rawAmountStr.replace(/[$,\-\(\)]/g, '').trim();
          const parsedAmount = parseFloat(cleanAmount);
          const validAmount = isNaN(parsedAmount) ? 0 : Math.abs(parsedAmount);
          
          // If amount was in parentheses, it's an expense
          if (hasParentheses && validAmount > 0) {
            transactionType = 'expense';
          }

          if (validAmount === 0) {
            skipped.push(`Row ${i + 1}: Zero or invalid amount`);
            continue;
          }

          // Build description for duplicate check
          const finalDescription = description || payeeName || `Imported from ${source}`;

          // Parse date
          let parsedDate = '';
          if (rawDate) {
            try {
              const dateObj = new Date(rawDate);
              if (!isNaN(dateObj.getTime())) {
                parsedDate = dateObj.toISOString().split('T')[0];
              } else {
                parsedDate = new Date().toISOString().split('T')[0];
              }
            } catch {
              parsedDate = new Date().toISOString().split('T')[0];
            }
          } else {
            parsedDate = new Date().toISOString().split('T')[0];
          }

          // Check for duplicate transaction before creating
          const existingMatch = await storage.findAnyMatchingTransaction(
            organizationId,
            new Date(parsedDate),
            validAmount.toFixed(2),
            finalDescription,
            transactionType
          );

          if (existingMatch) {
            skipped.push(`Row ${i + 1}: Duplicate - matches existing #${existingMatch.id}`);
            continue;
          }

          // Try to match vendor by name
          let matchedVendorId = null;
          if (payeeName && transactionType === 'expense') {
            const matchedVendor = vendors.find(v => 
              v.name.toLowerCase() === payeeName.toLowerCase() ||
              v.name.toLowerCase().includes(payeeName.toLowerCase()) ||
              payeeName.toLowerCase().includes(v.name.toLowerCase())
            );
            if (matchedVendor) {
              matchedVendorId = matchedVendor.id;
            }
          }

          // Try to match category by name
          let matchedCategoryId = null;
          if (accountInfo) {
            const matchedCategory = categories.find(c => 
              c.name.toLowerCase() === accountInfo.toLowerCase() ||
              c.name.toLowerCase().includes(accountInfo.toLowerCase()) ||
              accountInfo.toLowerCase().includes(c.name.toLowerCase())
            );
            if (matchedCategory) {
              matchedCategoryId = matchedCategory.id;
            }
          }

          const transactionData = {
            organizationId,
            createdBy: userId,
            date: parsedDate,
            type: transactionType,
            amount: validAmount,
            description: finalDescription,
            categoryId: matchedCategoryId,
            vendorId: matchedVendorId,
            clientId: null,
            fundId: null,
            programId: null,
            functionalCategory: null,
            source: 'manual' as const,
          };

          const validated = insertTransactionSchema.parse(transactionData);
          const transaction = await storage.createTransaction(validated);
          created.push(transaction);
        } catch (error: any) {
          console.error(`${source.toUpperCase()} Import Error on row ${i + 1}:`, error);
          errors.push(`Row ${i + 1}: ${error.message || 'Unknown error'}`);
        }
      }

      // Log audit trail
      await storage.logCreate(
        organizationId,
        userId,
        'bulk_operation',
        `${source}_import`,
        { imported: created.length, errors: errors.length, skipped: skipped.length, totalRows: parseResult.data.length }
      );

      console.log(`[${source.toUpperCase()} Import] Complete -`, 'Created:', created.length, 'Skipped:', skipped.length, 'Errors:', errors.length);

      res.json({
        message: `Import complete: ${created.length} transactions created, ${skipped.length} skipped, ${errors.length} errors`,
        created: created.length,
        skipped: skipped.length,
        errors: errors.length,
        createdTransactions: created,
        skippedDetails: skipped,
        errorDetails: errors,
      });
    } catch (error) {
      console.error(`Error importing from accounting software:`, error);
      res.status(500).json({ message: "Failed to import from accounting software" });
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

  // Get reconciled transactions (with pagination for performance)
  app.get('/api/reconciliation/reconciled/:organizationId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
      
      // Check user has access
      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      const reconciledTransactions = await storage.getReconciledTransactions(organizationId, limit, offset);
      res.json(reconciledTransactions);
    } catch (error) {
      console.error("Error fetching reconciled transactions:", error);
      res.status(500).json({ message: "Failed to fetch reconciled transactions" });
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
      
      // Record audit log for bulk reconciliation
      await storage.recordReconciliationAction({
        organizationId,
        action: 'bulk_reconciled',
        previousStatus: 'pending',
        newStatus: 'reconciled',
        notes: `Bulk reconciled ${count} transactions`,
        performedBy: userId,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
      
      res.json({ count });
    } catch (error) {
      console.error("Error bulk reconciling transactions:", error);
      res.status(500).json({ message: "Failed to reconcile transactions" });
    }
  });

  // Reconciliation Audit Log routes
  app.get('/api/reconciliation/audit-logs/:organizationId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);

      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied" });
      }

      const logs = await storage.getReconciliationAuditLogs(organizationId, {
        transactionId: req.query.transactionId ? parseInt(req.query.transactionId as string) : undefined,
        bankAccountId: req.query.bankAccountId ? parseInt(req.query.bankAccountId as string) : undefined,
        action: req.query.action as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 100,
      });

      res.json(logs);
    } catch (error) {
      console.error("Error fetching reconciliation audit logs:", error);
      res.status(500).json({ message: "Failed to fetch audit logs" });
    }
  });

  app.get('/api/reconciliation/audit-logs/:organizationId/export', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);
      const format = (req.query.format as 'csv' | 'json') || 'csv';

      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied" });
      }

      const exportData = await storage.exportReconciliationAuditLogs(organizationId, format);

      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=reconciliation-audit-logs.csv');
      } else {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=reconciliation-audit-logs.json');
      }

      res.send(exportData);
    } catch (error) {
      console.error("Error exporting reconciliation audit logs:", error);
      res.status(500).json({ message: "Failed to export audit logs" });
    }
  });

  // Reconciliation Alerts routes
  app.get('/api/reconciliation/alerts/:organizationId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);
      const acknowledged = req.query.acknowledged === 'true' ? true : req.query.acknowledged === 'false' ? false : undefined;

      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied" });
      }

      const alerts = await storage.getReconciliationAlerts(organizationId, acknowledged);
      res.json(alerts);
    } catch (error) {
      console.error("Error fetching reconciliation alerts:", error);
      res.status(500).json({ message: "Failed to fetch alerts" });
    }
  });

  app.post('/api/reconciliation/alerts/:organizationId/check', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);

      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied" });
      }

      const result = await storage.checkAndSendReconciliationAlerts(organizationId);
      res.json(result);
    } catch (error) {
      console.error("Error checking reconciliation alerts:", error);
      res.status(500).json({ message: "Failed to check alerts" });
    }
  });

  app.post('/api/reconciliation/alerts/:id/acknowledge', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const alertId = parseInt(req.params.id);

      const alert = await storage.acknowledgeReconciliationAlert(alertId, userId);
      res.json(alert);
    } catch (error) {
      console.error("Error acknowledging reconciliation alert:", error);
      res.status(500).json({ message: "Failed to acknowledge alert" });
    }
  });

  app.get('/api/reconciliation/stale-count/:organizationId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);
      const days = req.query.days ? parseInt(req.query.days as string) : 30;

      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied" });
      }

      const count = await storage.getStaleUnreconciledCount(organizationId, days);
      res.json({ count, daysSinceThreshold: days });
    } catch (error) {
      console.error("Error getting stale unreconciled count:", error);
      res.status(500).json({ message: "Failed to get stale count" });
    }
  });

  // Multi-account reconciliation
  app.get('/api/reconciliation/by-account/:organizationId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);
      const accountIds = req.query.accountIds ? (req.query.accountIds as string).split(',').map(Number) : undefined;

      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Get all transactions grouped by bank account
      const allTransactions = await storage.getUnreconciledTransactions(organizationId);
      
      // Group by plaidAccountId
      const byAccount = new Map<number | null, any[]>();
      for (const tx of allTransactions) {
        const accountId = tx.plaidAccountId || null;
        if (accountIds && accountId && !accountIds.includes(accountId)) continue;
        
        if (!byAccount.has(accountId)) {
          byAccount.set(accountId, []);
        }
        byAccount.get(accountId)!.push(tx);
      }

      const result: Array<{ accountId: number | null; accountName: string; transactions: any[]; count: number }> = [];
      for (const [accountId, txs] of byAccount.entries()) {
        result.push({
          accountId,
          accountName: accountId ? `Account ${accountId}` : 'Manual Entries',
          transactions: txs,
          count: txs.length,
        });
      }

      res.json(result);
    } catch (error) {
      console.error("Error fetching multi-account reconciliation:", error);
      res.status(500).json({ message: "Failed to fetch reconciliation by account" });
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

      const result = await storage.autoReconcileTransactions(organizationId, userId);
      res.json(result);
    } catch (error) {
      console.error("Error auto-reconciling transactions:", error);
      res.status(500).json({ message: "Failed to auto-reconcile transactions" });
    }
  });

  // Bank Reconciliation Session routes
  app.get('/api/bank-reconciliations/:organizationId/last', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);
      const accountName = req.query.accountName as string | undefined;

      // Check user has access
      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      const lastReconciliation = await storage.getLastBankReconciliation(organizationId, accountName);
      res.json(lastReconciliation || null);
    } catch (error) {
      console.error("Error fetching last bank reconciliation:", error);
      res.status(500).json({ message: "Failed to fetch last bank reconciliation" });
    }
  });

  app.post('/api/bank-reconciliations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const reconciliationData = insertBankReconciliationSchema.parse({
        ...req.body,
        createdBy: userId,
      });

      // Check user has access and permission
      const userRole = await storage.getUserRole(userId, reconciliationData.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      if (!hasPermission(userRole.role, userRole.permissions, 'edit_transactions')) {
        return res.status(403).json({ message: "You don't have permission to create reconciliations" });
      }

      // Populate statementDate from statementEndDate for backwards compatibility
      const dataWithStatementDate = {
        ...reconciliationData,
        statementDate: reconciliationData.statementEndDate,
      };

      const newReconciliation = await storage.createBankReconciliation(dataWithStatementDate as InsertBankReconciliation);
      res.json(newReconciliation);
    } catch (error) {
      console.error("Error creating bank reconciliation:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid reconciliation data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create bank reconciliation" });
    }
  });

  app.get('/api/bank-reconciliations/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const reconciliationId = parseInt(req.params.id);

      const reconciliation = await storage.getBankReconciliation(reconciliationId);
      if (!reconciliation) {
        return res.status(404).json({ message: "Reconciliation not found" });
      }

      // Check user has access
      const userRole = await storage.getUserRole(userId, reconciliation.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      res.json(reconciliation);
    } catch (error) {
      console.error("Error fetching reconciliation:", error);
      res.status(500).json({ message: "Failed to fetch reconciliation" });
    }
  });

  app.patch('/api/bank-reconciliations/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const reconciliationId = parseInt(req.params.id);

      const reconciliation = await storage.getBankReconciliation(reconciliationId);
      if (!reconciliation) {
        return res.status(404).json({ message: "Reconciliation not found" });
      }

      // Check user has access and permission
      const userRole = await storage.getUserRole(userId, reconciliation.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      if (!hasPermission(userRole.role, userRole.permissions, 'edit_transactions')) {
        return res.status(403).json({ message: "You don't have permission to update reconciliations" });
      }

      const updated = await storage.updateBankReconciliation(reconciliationId, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Error updating reconciliation:", error);
      res.status(500).json({ message: "Failed to update reconciliation" });
    }
  });

  // Get all reconciliations for an organization (history)
  app.get('/api/bank-reconciliations/:organizationId/all', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);

      // Check user has access
      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      const reconciliations = await storage.getBankReconciliations(organizationId);
      res.json(reconciliations);
    } catch (error) {
      console.error("Error fetching reconciliation history:", error);
      res.status(500).json({ message: "Failed to fetch reconciliation history" });
    }
  });

  // Delete a reconciliation and all its related data
  app.delete('/api/bank-reconciliations/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const reconciliationId = parseInt(req.params.id);

      const reconciliation = await storage.getBankReconciliation(reconciliationId);
      if (!reconciliation) {
        return res.status(404).json({ message: "Reconciliation not found" });
      }

      // Check user has access and permission
      const userRole = await storage.getUserRole(userId, reconciliation.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      if (!hasPermission(userRole.role, userRole.permissions, 'edit_transactions')) {
        return res.status(403).json({ message: "You don't have permission to delete reconciliations" });
      }

      await storage.deleteBankReconciliation(reconciliationId);
      res.json({ success: true, message: "Reconciliation deleted successfully" });
    } catch (error) {
      console.error("Error deleting reconciliation:", error);
      res.status(500).json({ message: "Failed to delete reconciliation" });
    }
  });

  // Get transactions within reconciliation date range
  app.get('/api/bank-reconciliations/:id/transactions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const reconciliationId = parseInt(req.params.id);

      const reconciliation = await storage.getBankReconciliation(reconciliationId);
      if (!reconciliation) {
        return res.status(404).json({ message: "Reconciliation not found" });
      }

      // Check user has access
      const userRole = await storage.getUserRole(userId, reconciliation.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      // Get transactions within the statement date range
      const transactions = await storage.getTransactionsByDateRange(
        reconciliation.organizationId,
        new Date(reconciliation.statementStartDate),
        new Date(reconciliation.statementEndDate)
      );

      res.json(transactions);
    } catch (error) {
      console.error("Error fetching reconciliation transactions:", error);
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  // Reconcile all transactions in date range
  app.post('/api/bank-reconciliations/:id/reconcile-all', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const reconciliationId = parseInt(req.params.id);

      const reconciliation = await storage.getBankReconciliation(reconciliationId);
      if (!reconciliation) {
        return res.status(404).json({ message: "Reconciliation not found" });
      }

      // Check user has access and permission
      const userRole = await storage.getUserRole(userId, reconciliation.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      if (!hasPermission(userRole.role, userRole.permissions, 'edit_transactions')) {
        return res.status(403).json({ message: "You don't have permission to reconcile transactions" });
      }

      // Get transactions within the statement date range
      const transactions = await storage.getTransactionsByDateRange(
        reconciliation.organizationId,
        new Date(reconciliation.statementStartDate),
        new Date(reconciliation.statementEndDate)
      );

      // Mark all unreconciled transactions as reconciled
      const unreconciledIds = transactions
        .filter(t => t.reconciliationStatus !== 'reconciled')
        .map(t => t.id);

      if (unreconciledIds.length > 0) {
        await storage.bulkReconcileTransactions(unreconciledIds, userId);
      }

      // Update reconciliation status to reconciled
      await storage.updateBankReconciliation(reconciliationId, {
        status: 'reconciled',
        reconciledDate: new Date(),
      });

      res.json({ 
        reconciledCount: unreconciledIds.length,
        message: `${unreconciledIds.length} transactions reconciled successfully`
      });
    } catch (error) {
      console.error("Error reconciling transactions:", error);
      res.status(500).json({ message: "Failed to reconcile transactions" });
    }
  });

  // Parse PDF bank statement and extract transactions
  app.post('/api/bank-reconciliations/:id/parse-pdf', isAuthenticated, pdfUpload.single('pdf'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const reconciliationId = parseInt(req.params.id);

      const reconciliation = await storage.getBankReconciliation(reconciliationId);
      if (!reconciliation) {
        return res.status(404).json({ message: "Reconciliation not found" });
      }

      // Check user has access
      const userRole = await storage.getUserRole(userId, reconciliation.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No PDF file provided" });
      }

      // Extract text from PDF using pdfjs-dist
      const text = await extractTextFromPdf(req.file.buffer);

      // Extract transactions from PDF text
      const extractedTransactions = parseBankStatementText(text);

      res.json({ 
        rawText: text,
        transactions: extractedTransactions,
        message: `Extracted ${extractedTransactions.length} transactions from PDF`
      });
    } catch (error) {
      console.error("Error parsing PDF:", error);
      res.status(500).json({ message: "Failed to parse PDF statement" });
    }
  });

  // Helper function to extract text from PDF using unpdf
  async function extractTextFromPdf(buffer: Buffer): Promise<string> {
    const { extractText } = await import("unpdf");
    const uint8Array = new Uint8Array(buffer);
    const result = await extractText(uint8Array);
    
    // Handle different result formats from unpdf
    if (typeof result.text === 'string') {
      return result.text;
    } else if (Array.isArray(result.text)) {
      return result.text.join('\n');
    } else if (result.text && typeof result.text === 'object') {
      // If it's an object with pages, concatenate all page text
      return Object.values(result.text).flat().join('\n');
    }
    return "";
  }

  // Helper function to normalize date strings to ISO format
  function normalizeDate(dateStr: string, inferredYear?: string): string | null {
    const months: { [key: string]: string } = {
      'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04', 'may': '05', 'jun': '06',
      'jul': '07', 'aug': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
    };

    // Default year if not specified
    const defaultYear = inferredYear || new Date().getFullYear().toString();

    // Try MM/DD (without year - common in bank statements)
    let match = dateStr.match(/^(\d{1,2})\/(\d{1,2})$/);
    if (match) {
      const month = match[1].padStart(2, '0');
      const day = match[2].padStart(2, '0');
      return `${defaultYear}-${month}-${day}`;
    }

    // Try MM/DD/YY or MM/DD/YYYY
    match = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (match) {
      const month = match[1].padStart(2, '0');
      const day = match[2].padStart(2, '0');
      let year = match[3];
      if (year.length === 2) {
        year = parseInt(year) > 50 ? '19' + year : '20' + year;
      }
      return `${year}-${month}-${day}`;
    }

    // Try MM-DD-YY or MM-DD-YYYY
    match = dateStr.match(/^(\d{1,2})-(\d{1,2})-(\d{2,4})$/);
    if (match) {
      const month = match[1].padStart(2, '0');
      const day = match[2].padStart(2, '0');
      let year = match[3];
      if (year.length === 2) {
        year = parseInt(year) > 50 ? '19' + year : '20' + year;
      }
      return `${year}-${month}-${day}`;
    }

    // Try YYYY-MM-DD (already ISO)
    match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      return dateStr;
    }

    // Try "Jan 15, 2024" or "Jan 15 2024"
    match = dateStr.match(/^(\w{3})\s+(\d{1,2}),?\s+(\d{4})$/i);
    if (match) {
      const monthNum = months[match[1].toLowerCase()];
      if (monthNum) {
        const day = match[2].padStart(2, '0');
        return `${match[3]}-${monthNum}-${day}`;
      }
    }

    return null;
  }

  // Helper function to parse bank statement text and extract transactions
  function parseBankStatementText(text: string): Array<{
    date: string;
    description: string;
    amount: string;
    type: 'income' | 'expense';
  }> {
    const transactions: Array<{
      date: string;
      description: string;
      amount: string;
      type: 'income' | 'expense';
    }> = [];

    // Split text into lines
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

    // Try to extract year from statement period (e.g., "Statement Period 01/01/19 thru 01/31/19")
    let inferredYear = new Date().getFullYear().toString();
    const periodMatch = text.match(/(?:Statement Period|Period)[:\s]*(\d{1,2}\/\d{1,2}\/(\d{2,4}))/i);
    if (periodMatch && periodMatch[2]) {
      let year = periodMatch[2];
      if (year.length === 2) {
        year = parseInt(year) > 50 ? '19' + year : '20' + year;
      }
      inferredYear = year;
    }

    // Common date patterns - including MM/DD without year
    const datePatterns = [
      /^(\d{1,2}\/\d{1,2}\/\d{2,4})/,  // MM/DD/YY or MM/DD/YYYY
      /^(\d{1,2}\/\d{1,2})(?:\s|$)/,    // MM/DD (without year)
      /^(\d{1,2}-\d{1,2}-\d{2,4})/,     // MM-DD-YY or MM-DD-YYYY
      /^(\w{3}\s+\d{1,2},?\s+\d{4})/i,  // Jan 15, 2024
      /^(\d{4}-\d{2}-\d{2})/,           // YYYY-MM-DD
    ];

    for (const line of lines) {
      // Skip header lines and summary lines
      if (/^(Trans Date|Date|Beginning Balance|Ending Balance|Total)/i.test(line)) continue;
      if (/^(DEPOSITS|WITHDRAWALS|CHECKS|SUMMARY|SERVICE CHARGE)/i.test(line)) continue;

      // Check if line starts with a date
      let dateMatch = null;
      for (const pattern of datePatterns) {
        const match = line.match(pattern);
        if (match) {
          dateMatch = match[1];
          break;
        }
      }

      if (!dateMatch) continue;

      // Normalize the date to ISO format
      const normalizedDate = normalizeDate(dateMatch, inferredYear);
      if (!normalizedDate) continue;

      // Look for amounts in the line - match currency amounts like $300.00 or -$16.59
      const amountMatches = [...line.matchAll(/(-?\$\d{1,3}(?:,\d{3})*\.\d{2})/g)];
      if (amountMatches.length === 0) continue;

      // Use the last amount on the line (typically the transaction amount, not running balance)
      let amountStr = amountMatches[amountMatches.length - 1][0];
      
      // Clean the amount string
      const cleanAmount = amountStr.replace(/[\$,\s]/g, '');
      
      // Determine if it's a debit (negative) or credit (positive)
      const isNegative = amountStr.startsWith('-') || amountStr.includes('-$');
      
      // Extract description (everything between date and the amount)
      const dateEndIndex = line.indexOf(dateMatch) + dateMatch.length;
      const amountIndex = line.lastIndexOf(amountStr);
      
      if (amountIndex <= dateEndIndex) continue;
      
      let description = line.substring(dateEndIndex, amountIndex).trim();
      
      // Remove secondary date if present (e.g., "01/01    12/31    Withdrawal...")
      description = description.replace(/^\d{1,2}\/\d{1,2}\s+/, '');
      
      // Clean up description
      description = description.replace(/\s+/g, ' ').trim();
      
      // Skip if description is too short or looks like a header
      if (description.length < 3) continue;
      if (/^(date|description|amount|balance|debit|credit)$/i.test(description)) continue;

      // Parse amount value
      const numericAmount = Math.abs(parseFloat(cleanAmount.replace(/[\(\)]/g, '')));
      if (isNaN(numericAmount) || numericAmount === 0) continue;

      // Skip very large amounts that might be balances
      if (numericAmount > 1000000) continue;

      transactions.push({
        date: normalizedDate,
        description: description,
        amount: numericAmount.toFixed(2),
        type: isNegative ? 'expense' : 'income'
      });
    }

    return transactions;
  }

  // Bank Statement Entry routes
  app.get('/api/bank-statement-entries/:reconciliationId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const reconciliationId = parseInt(req.params.reconciliationId);

      const reconciliation = await storage.getBankReconciliation(reconciliationId);
      if (!reconciliation) {
        return res.status(404).json({ message: "Reconciliation not found" });
      }

      // Check user has access
      const userRole = await storage.getUserRole(userId, reconciliation.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      const entries = await storage.getBankStatementEntries(reconciliationId);
      res.json(entries);
    } catch (error) {
      console.error("Error fetching statement entries:", error);
      res.status(500).json({ message: "Failed to fetch statement entries" });
    }
  });

  app.post('/api/bank-statement-entries', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { reconciliationId, entries } = req.body;

      const reconciliation = await storage.getBankReconciliation(reconciliationId);
      if (!reconciliation) {
        return res.status(404).json({ message: "Reconciliation not found" });
      }

      // Check user has access and permission
      const userRole = await storage.getUserRole(userId, reconciliation.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      if (!hasPermission(userRole.role, userRole.permissions, 'edit_transactions')) {
        return res.status(403).json({ message: "You don't have permission to add statement entries" });
      }

      // Convert date strings to Date objects before inserting
      const processEntries = (entryList: any[]) => {
        return entryList.map(entry => {
          const dateValue = entry.date;
          let dateObj: Date;
          if (dateValue instanceof Date) {
            dateObj = dateValue;
          } else if (typeof dateValue === 'string') {
            dateObj = new Date(dateValue);
          } else {
            dateObj = new Date();
          }
          console.log(`Processing entry date: ${dateValue} -> ${dateObj} (valid: ${!isNaN(dateObj.getTime())})`);
          return {
            reconciliationId: entry.reconciliationId,
            date: dateObj,
            description: entry.description,
            amount: entry.amount,
            type: entry.type,
            isMatched: entry.isMatched || 0
          };
        });
      };

      console.log("Received entries:", JSON.stringify(entries, null, 2));

      // Bulk create if array provided, otherwise single create
      const processedEntries = Array.isArray(entries) ? processEntries(entries) : null;
      console.log("Processed entries:", JSON.stringify(processedEntries, null, 2));
      
      const newEntries = Array.isArray(entries)
        ? await storage.bulkCreateBankStatementEntries(processedEntries!)
        : await storage.createBankStatementEntry({
            reconciliationId: req.body.reconciliationId,
            date: req.body.date instanceof Date ? req.body.date : new Date(req.body.date),
            description: req.body.description,
            amount: req.body.amount,
            type: req.body.type,
            isMatched: req.body.isMatched || 0
          });

      res.json(newEntries);
    } catch (error) {
      console.error("Error creating statement entries:", error);
      console.error("Request body:", JSON.stringify(req.body, null, 2));
      res.status(500).json({ message: "Failed to create statement entries" });
    }
  });

  // Delete a single bank statement entry
  app.delete('/api/bank-statement-entries/:entryId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const entryId = parseInt(req.params.entryId);

      // Get the entry first to find the reconciliation
      const entry = await storage.getBankStatementEntry(entryId);
      if (!entry) {
        return res.status(404).json({ message: "Bank statement entry not found" });
      }

      // Get the reconciliation to verify permissions
      const reconciliation = await storage.getBankReconciliation(entry.reconciliationId);
      if (!reconciliation) {
        return res.status(404).json({ message: "Reconciliation not found" });
      }

      // Check user has access and permission
      const userRole = await storage.getUserRole(userId, reconciliation.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      if (!hasPermission(userRole.role, userRole.permissions, 'edit_transactions')) {
        return res.status(403).json({ message: "You don't have permission to delete statement entries" });
      }

      await storage.deleteBankStatementEntry(entryId);
      res.json({ success: true, message: "Bank statement entry deleted successfully" });
    } catch (error) {
      console.error("Error deleting statement entry:", error);
      res.status(500).json({ message: "Failed to delete statement entry" });
    }
  });

  // Reconciliation Match routes
  app.get('/api/reconciliation-matches/:reconciliationId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const reconciliationId = parseInt(req.params.reconciliationId);

      const reconciliation = await storage.getBankReconciliation(reconciliationId);
      if (!reconciliation) {
        return res.status(404).json({ message: "Reconciliation not found" });
      }

      // Check user has access
      const userRole = await storage.getUserRole(userId, reconciliation.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      const matches = await storage.getReconciliationMatches(reconciliationId);
      res.json(matches);
    } catch (error) {
      console.error("Error fetching matches:", error);
      res.status(500).json({ message: "Failed to fetch matches" });
    }
  });

  app.post('/api/reconciliation-matches', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { reconciliationId, transactionId, statementEntryId } = req.body;

      const reconciliation = await storage.getBankReconciliation(reconciliationId);
      if (!reconciliation) {
        return res.status(404).json({ message: "Reconciliation not found" });
      }

      // Check user has access and permission
      const userRole = await storage.getUserRole(userId, reconciliation.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      if (!hasPermission(userRole.role, userRole.permissions, 'edit_transactions')) {
        return res.status(403).json({ message: "You don't have permission to create matches" });
      }

      const match = await storage.matchTransactionToStatementEntry(
        reconciliationId,
        transactionId,
        statementEntryId,
        userId
      );

      res.json(match);
    } catch (error: any) {
      console.error("Error creating match:", error);
      
      // Handle duplicate match attempts with 409 Conflict
      if (error.message?.includes('already')) {
        return res.status(409).json({ message: error.message });
      }
      
      res.status(500).json({ message: error.message || "Failed to create match" });
    }
  });

  app.delete('/api/reconciliation-matches/:matchId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const matchId = parseInt(req.params.matchId);

      const matches = await storage.getReconciliationMatches(0); // Get match to check permissions
      const match = matches.find(m => m.id === matchId);
      
      if (!match) {
        return res.status(404).json({ message: "Match not found" });
      }

      const reconciliation = await storage.getBankReconciliation(match.reconciliationId);
      if (!reconciliation) {
        return res.status(404).json({ message: "Reconciliation not found" });
      }

      // Check user has access and permission
      const userRole = await storage.getUserRole(userId, reconciliation.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      if (!hasPermission(userRole.role, userRole.permissions, 'edit_transactions')) {
        return res.status(403).json({ message: "You don't have permission to delete matches" });
      }

      await storage.unmatchTransaction(matchId);
      res.json({ message: "Match deleted successfully" });
    } catch (error) {
      console.error("Error deleting match:", error);
      res.status(500).json({ message: "Failed to delete match" });
    }
  });

  app.get('/api/reconciliation-suggestions/:reconciliationId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const reconciliationId = parseInt(req.params.reconciliationId);

      const reconciliation = await storage.getBankReconciliation(reconciliationId);
      if (!reconciliation) {
        return res.status(404).json({ message: "Reconciliation not found" });
      }

      // Check user has access
      const userRole = await storage.getUserRole(userId, reconciliation.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      const suggestions = await storage.getSuggestedMatches(reconciliationId);
      res.json(suggestions);
    } catch (error) {
      console.error("Error getting match suggestions:", error);
      res.status(500).json({ message: "Failed to get match suggestions" });
    }
  });

  // Get all matched transaction IDs for an organization (for visual indication in transaction logs)
  app.get('/api/matched-transaction-ids/:organizationId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);

      // Check user has access
      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      const matchedIds = await storage.getMatchedTransactionIds(organizationId);
      res.json(matchedIds);
    } catch (error) {
      console.error("Error getting matched transaction IDs:", error);
      res.status(500).json({ message: "Failed to get matched transaction IDs" });
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
      // Attachment uploads only supported on Replit environment
      if (!isReplitEnvironment) {
        return res.status(501).json({ message: "Attachment uploads are not supported in this environment" });
      }
      
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
      // Attachment uploads only supported on Replit environment
      if (!isReplitEnvironment) {
        return res.status(501).json({ message: "Attachment uploads are not supported in this environment" });
      }
      
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
      // Attachment downloads only supported on Replit environment
      if (!isReplitEnvironment) {
        return res.status(501).json({ message: "Attachment downloads are not supported in this environment" });
      }
      
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
      // Attachment operations only supported on Replit environment
      if (!isReplitEnvironment) {
        return res.status(501).json({ message: "Attachment operations are not supported in this environment" });
      }
      
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

  // Enhanced AI matching - suggests category, grant, program, and fund
  app.post('/api/ai/enhanced-matching/:organizationId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);
      const { description, amount, type, vendorName } = req.body;

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

      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount < 0) {
        return res.status(400).json({ message: "Amount must be a valid positive number" });
      }

      const suggestion = await suggestEnhancedMatching(
        organizationId,
        description,
        parsedAmount,
        type,
        vendorName
      );

      if (!suggestion) {
        return res.status(404).json({ message: "No suitable matches found" });
      }

      res.json(suggestion);
    } catch (error) {
      console.error("Error with enhanced matching:", error);
      res.status(500).json({ message: "Failed to get enhanced matching suggestions" });
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

  // AI Pattern Detection routes
  app.get('/api/ai/detect-recurring/:organizationId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);
      const lookbackMonths = parseInt(req.query.months as string) || 6;

      // Check user has access to this organization
      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      // Check rate limit
      if (!checkAiRateLimit(userId, organizationId)) {
        return res.status(429).json({ message: "Too many AI requests. Please try again in a minute." });
      }

      const patterns = await detectRecurringPatterns(organizationId, lookbackMonths);
      
      // Filter out dismissed patterns (normalize vendor names to lowercase for matching)
      const dismissedPatterns = await storage.getDismissedPatterns(organizationId);
      const dismissedVendorNames = new Set(
        dismissedPatterns.map(dp => `${dp.vendorName.toLowerCase()}-${dp.patternType}`)
      );
      
      const filteredPatterns = patterns.filter(
        p => !dismissedVendorNames.has(`${p.vendorName.toLowerCase()}-${p.transactionType}`)
      );
      
      res.json(filteredPatterns);
    } catch (error) {
      console.error("Error detecting recurring patterns:", error);
      res.status(500).json({ message: "Failed to detect recurring patterns" });
    }
  });
  
  // Dismiss a detected pattern (mark as "not recurring")
  app.post('/api/ai/dismiss-pattern/:organizationId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);

      const dismissSchema = z.object({
        vendorName: z.string().min(1, "Vendor name is required"),
        patternType: z.enum(['income', 'expense']),
        frequency: z.enum(['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly']).optional(),
        averageAmount: z.number().optional(),
        reason: z.enum(['not_recurring', 'one_time', 'already_tracked', 'other', 'one_off', 'variable', 'ignore_vendor']).optional()
      });

      const parseResult = dismissSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          message: "Invalid dismiss data", 
          errors: parseResult.error.errors 
        });
      }

      // Check user has access to this organization
      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      // Store vendor name in lowercase for consistent matching
      const dismissed = await storage.createDismissedPattern({
        organizationId,
        vendorName: parseResult.data.vendorName.toLowerCase(),
        patternType: parseResult.data.patternType,
        frequency: parseResult.data.frequency || null,
        averageAmount: parseResult.data.averageAmount ? String(parseResult.data.averageAmount) : null,
        reason: parseResult.data.reason || 'not_recurring',
        dismissedBy: userId
      });

      res.json(dismissed);
    } catch (error) {
      console.error("Error dismissing pattern:", error);
      res.status(500).json({ message: "Failed to dismiss pattern" });
    }
  });

  // Get dismissed patterns for an organization
  app.get('/api/ai/dismissed-patterns/:organizationId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);

      // Check user has access to this organization
      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      const dismissed = await storage.getDismissedPatterns(organizationId);
      res.json(dismissed);
    } catch (error) {
      console.error("Error getting dismissed patterns:", error);
      res.status(500).json({ message: "Failed to get dismissed patterns" });
    }
  });

  // Restore a dismissed pattern (remove from dismissed list)
  app.delete('/api/ai/dismissed-patterns/:organizationId/:patternId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);
      const patternId = parseInt(req.params.patternId);

      // Check user has access to this organization
      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      await storage.deleteDismissedPattern(patternId);
      res.json({ message: "Pattern restored" });
    } catch (error) {
      console.error("Error restoring pattern:", error);
      res.status(500).json({ message: "Failed to restore pattern" });
    }
  });

  // Suggest funding source based on past transactions for a vendor
  app.get('/api/ai/suggest-funding-source/:organizationId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);
      const vendorName = req.query.vendorName as string;

      if (!vendorName) {
        return res.status(400).json({ message: "Vendor name is required" });
      }

      // Check user has access to this organization
      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      // Look for past transactions to this vendor that were linked to grants via bills
      const bills = await storage.getBills(organizationId);
      const vendors = await storage.getVendors(organizationId);
      
      // Find vendor by name (case-insensitive)
      const matchingVendor = vendors.find(v => 
        v.name.toLowerCase() === vendorName.toLowerCase()
      );

      if (matchingVendor) {
        // Find bills for this vendor that have grant funding
        const vendorBills = bills.filter(b => 
          b.vendorId === matchingVendor.id && 
          b.fundingSource === 'grant' && 
          b.grantId
        );

        if (vendorBills.length > 0) {
          // Get the most commonly used grant
          const grantCounts: Record<number, number> = {};
          vendorBills.forEach(b => {
            if (b.grantId) {
              grantCounts[b.grantId] = (grantCounts[b.grantId] || 0) + 1;
            }
          });

          const mostCommonGrantId = Object.entries(grantCounts)
            .sort(([, a], [, b]) => b - a)[0]?.[0];

          if (mostCommonGrantId) {
            const grants = await storage.getGrantsByOrganizationId(organizationId);
            const grant = grants.find(g => g.id === parseInt(mostCommonGrantId));
            
            if (grant && grant.status === 'active') {
              return res.json({
                suggestedGrantId: grant.id,
                suggestedGrantName: grant.name,
                confidence: Math.round((vendorBills.length / bills.filter(b => b.vendorId === matchingVendor.id).length) * 100)
              });
            }
          }
        }
      }

      // No suggestion found
      res.json({ suggestedGrantId: null, suggestedGrantName: null });
    } catch (error) {
      console.error("Error suggesting funding source:", error);
      res.status(500).json({ message: "Failed to suggest funding source" });
    }
  });

  app.post('/api/ai/create-bill-from-pattern/:organizationId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);

      // Validate pattern with Zod schema
      const patternSchema = z.object({
        vendorName: z.string().min(1, "Vendor name is required"),
        vendorId: z.number().optional(),
        categoryId: z.number().optional(),
        categoryName: z.string().optional(),
        averageAmount: z.number().positive("Average amount must be positive"),
        minAmount: z.number().min(0),
        maxAmount: z.number().min(0),
        frequency: z.enum(['weekly', 'biweekly', 'monthly', 'quarterly', 'yearly']),
        transactionType: z.enum(['income', 'expense']),
        transactionCount: z.number().int().min(1),
        transactions: z.array(z.object({
          id: z.number(),
          date: z.string(),
          amount: z.string(),
          description: z.string()
        })),
        confidence: z.number().min(0).max(100),
        suggestedBillName: z.string().optional(),
        dayOfMonth: z.number().min(1).max(28).optional(),
        fundingSource: z.enum(['unrestricted', 'grant']).optional(),
        grantId: z.number().nullable().optional(),
        categoryId: z.number().nullable().optional()
      });

      const parseResult = patternSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          message: "Invalid pattern data", 
          errors: parseResult.error.errors 
        });
      }
      const pattern = parseResult.data;

      // Check user has access to this organization
      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      if (!hasPermission(userRole.role, userRole.permissions, 'edit_transactions')) {
        return res.status(403).json({ message: "You don't have permission to create bills" });
      }

      const bill = await createBillFromPattern(
        organizationId, 
        pattern, 
        userId, 
        pattern.dayOfMonth,
        pattern.fundingSource,
        pattern.grantId,
        pattern.categoryId
      );
      if (!bill) {
        return res.status(500).json({ message: "Failed to create bill from pattern" });
      }

      // Log audit trail
      await storage.logAuditTrail({
        organizationId,
        userId,
        entityType: 'bill',
        entityId: bill.id.toString(),
        action: 'create',
        oldValues: null,
        newValues: { ...bill, source: 'ai_pattern_detection' },
        ipAddress: req.ip || null,
        userAgent: req.get('user-agent') || null
      });

      res.status(201).json(bill);
    } catch (error) {
      console.error("Error creating bill from pattern:", error);
      res.status(500).json({ message: "Failed to create bill from pattern" });
    }
  });

  app.get('/api/ai/suggest-budget/:organizationId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);
      const lookbackMonths = parseInt(req.query.months as string) || 6;

      // Check user has access to this organization
      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      // Check rate limit
      if (!checkAiRateLimit(userId, organizationId)) {
        return res.status(429).json({ message: "Too many AI requests. Please try again in a minute." });
      }

      const suggestions = await suggestBudget(organizationId, lookbackMonths);
      res.json(suggestions);
    } catch (error) {
      console.error("Error suggesting budget:", error);
      res.status(500).json({ message: "Failed to suggest budget" });
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

      const existing = await storage.getGrant(grantId);
      if (!existing) {
        return res.status(404).json({ message: "Grant not found" });
      }

      const userRole = await storage.getUserRole(userId, existing.organizationId);
      if (!userRole || (userRole.role !== 'owner' && userRole.role !== 'admin')) {
        return res.status(403).json({ message: "Access denied - only owners and admins can manage grants" });
      }

      // Parse and validate updates with proper date conversion
      const updates = updateGrantSchema.parse(req.body);

      const updated = await storage.updateGrant(grantId, updates);
      await storage.logUpdate(existing.organizationId, userId, 'grant', grantId.toString(), existing, updated);
      res.json(updated);
    } catch (error) {
      console.error("Error updating grant:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
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

  // Budget Alert Routes
  app.get('/api/budgets/:budgetId/alerts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const budgetId = parseInt(req.params.budgetId);

      const budget = await storage.getBudget(budgetId);
      if (!budget) {
        return res.status(404).json({ message: "Budget not found" });
      }

      const userRole = await storage.getUserRole(userId, budget.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied" });
      }

      const alerts = await storage.getBudgetAlerts(budgetId);
      res.json(alerts);
    } catch (error) {
      console.error("Error fetching budget alerts:", error);
      res.status(500).json({ message: "Failed to fetch budget alerts" });
    }
  });

  app.post('/api/budgets/:budgetId/alerts/:alertId/acknowledge', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const budgetId = parseInt(req.params.budgetId);
      const alertId = parseInt(req.params.alertId);

      const budget = await storage.getBudget(budgetId);
      if (!budget) {
        return res.status(404).json({ message: "Budget not found" });
      }

      const userRole = await storage.getUserRole(userId, budget.organizationId);
      if (!userRole || (userRole.role !== 'owner' && userRole.role !== 'admin' && userRole.role !== 'accountant')) {
        return res.status(403).json({ message: "Access denied - only managers can acknowledge alerts" });
      }

      const acknowledged = await storage.acknowledgeBudgetAlert(alertId, userId);
      res.json(acknowledged);
    } catch (error) {
      console.error("Error acknowledging budget alert:", error);
      res.status(500).json({ message: "Failed to acknowledge alert" });
    }
  });

  app.post('/api/organizations/:orgId/check-budget-alerts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const orgId = parseInt(req.params.orgId);

      const userRole = await storage.getUserRole(userId, orgId);
      if (!userRole || (userRole.role !== 'owner' && userRole.role !== 'admin')) {
        return res.status(403).json({ message: "Access denied - only owners and admins can trigger alert checks" });
      }

      const result = await storage.checkAndSendBudgetAlerts(orgId);
      res.json(result);
    } catch (error) {
      console.error("Error checking budget alerts:", error);
      res.status(500).json({ message: "Failed to check budget alerts" });
    }
  });

  // Multi-year budget routes
  app.get('/api/organizations/:orgId/multi-year-budgets', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const orgId = parseInt(req.params.orgId);
      const years = req.query.years ? (req.query.years as string).split(',').map(Number) : undefined;

      const userRole = await storage.getUserRole(userId, orgId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied" });
      }

      const summary = await storage.getMultiYearBudgetSummary(orgId, years);
      res.json(summary);
    } catch (error) {
      console.error("Error fetching multi-year budget summary:", error);
      res.status(500).json({ message: "Failed to fetch multi-year budget summary" });
    }
  });

  app.get('/api/organizations/:orgId/budgets/fiscal-year/:fiscalYear', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const orgId = parseInt(req.params.orgId);
      const fiscalYear = req.params.fiscalYear;

      const userRole = await storage.getUserRole(userId, orgId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied" });
      }

      const budgets = await storage.getBudgetsByFiscalYear(orgId, fiscalYear);
      res.json(budgets);
    } catch (error) {
      console.error("Error fetching budgets by fiscal year:", error);
      res.status(500).json({ message: "Failed to fetch budgets by fiscal year" });
    }
  });

  app.get('/api/organizations/:orgId/rolling-forecast', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const orgId = parseInt(req.params.orgId);
      const months = req.query.months ? parseInt(req.query.months as string) : 12;

      const userRole = await storage.getUserRole(userId, orgId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied" });
      }

      const forecast = await storage.getRollingForecast(orgId, months);
      res.json(forecast);
    } catch (error) {
      console.error("Error fetching rolling forecast:", error);
      res.status(500).json({ message: "Failed to fetch rolling forecast" });
    }
  });

  // Program-level budget routes with roll-up
  app.get('/api/organizations/:orgId/program-budget-summary', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const orgId = parseInt(req.params.orgId);

      const userRole = await storage.getUserRole(userId, orgId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied" });
      }

      const summary = await storage.getProgramBudgetSummary(orgId);
      res.json(summary);
    } catch (error) {
      console.error("Error fetching program budget summary:", error);
      res.status(500).json({ message: "Failed to fetch program budget summary" });
    }
  });

  app.get('/api/organizations/:orgId/budget-rollup', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const orgId = parseInt(req.params.orgId);

      const userRole = await storage.getUserRole(userId, orgId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied" });
      }

      const rollup = await storage.getOrganizationBudgetRollup(orgId);
      res.json(rollup);
    } catch (error) {
      console.error("Error fetching budget rollup:", error);
      res.status(500).json({ message: "Failed to fetch budget rollup" });
    }
  });

  // Enhanced cash flow projection routes
  app.get('/api/cash-flow/scenario/:scenarioId/projection', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const scenarioId = parseInt(req.params.scenarioId);

      // Verify user has access to the scenario's organization
      const scenario = await storage.getCashFlowScenario(scenarioId);
      if (!scenario) {
        return res.status(404).json({ message: "Scenario not found" });
      }

      const userRole = await storage.getUserRole(userId, scenario.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied" });
      }

      const projection = await storage.generateCashFlowProjection(scenarioId);
      res.json(projection);
    } catch (error) {
      console.error("Error generating cash flow projection:", error);
      res.status(500).json({ message: "Failed to generate cash flow projection" });
    }
  });

  app.get('/api/organizations/:orgId/cash-flow/export', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const orgId = parseInt(req.params.orgId);
      const scenarioId = req.query.scenarioId ? parseInt(req.query.scenarioId as string) : undefined;
      const format = (req.query.format as 'csv' | 'json') || 'csv';

      const userRole = await storage.getUserRole(userId, orgId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied" });
      }

      const exportData = await storage.exportCashFlowProjections(orgId, scenarioId, format);
      
      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=cash-flow-projections.csv');
      } else {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=cash-flow-projections.json');
      }
      
      res.send(exportData);
    } catch (error) {
      console.error("Error exporting cash flow projections:", error);
      res.status(500).json({ message: "Failed to export cash flow projections" });
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

      // Convert date strings to Date objects for Drizzle
      const updateData = { ...req.body };
      if (updateData.startDate && typeof updateData.startDate === 'string') {
        updateData.startDate = new Date(updateData.startDate);
      }
      if (updateData.endDate && typeof updateData.endDate === 'string') {
        updateData.endDate = new Date(updateData.endDate);
      }

      const updated = await storage.updateBudget(budgetId, updateData);
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
      
      // Get the budget item first
      const item = await storage.getBudgetItem(itemId);
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

  // Budget Income Item routes
  app.get('/api/budgets/:budgetId/income-items', isAuthenticated, async (req: any, res) => {
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

      const incomeItems = await storage.getBudgetIncomeItems(budgetId);
      res.json(incomeItems);
    } catch (error) {
      console.error("Error fetching budget income items:", error);
      res.status(500).json({ message: "Failed to fetch budget income items" });
    }
  });

  app.post('/api/budgets/:budgetId/income-items', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const budgetId = parseInt(req.params.budgetId);
      
      const budget = await storage.getBudget(budgetId);
      if (!budget) {
        return res.status(404).json({ message: "Budget not found" });
      }

      const userRole = await storage.getUserRole(userId, budget.organizationId);
      if (!userRole || (userRole.role !== 'owner' && userRole.role !== 'admin' && userRole.role !== 'accountant')) {
        return res.status(403).json({ message: "Access denied - only owners, admins, and accountants can manage budget income" });
      }

      const data = insertBudgetIncomeItemSchema.parse({ 
        ...req.body, 
        budgetId, 
        organizationId: budget.organizationId 
      });
      const item = await storage.createBudgetIncomeItem(data);
      res.status(201).json(item);
    } catch (error) {
      console.error("Error creating budget income item:", error);
      res.status(400).json({ message: "Failed to create budget income item" });
    }
  });

  app.patch('/api/budget-income-items/:itemId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const itemId = parseInt(req.params.itemId);
      
      const updated = await storage.updateBudgetIncomeItem(itemId, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Error updating budget income item:", error);
      res.status(400).json({ message: "Failed to update budget income item" });
    }
  });

  app.delete('/api/budget-income-items/:itemId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const itemId = parseInt(req.params.itemId);
      
      await storage.deleteBudgetIncomeItem(itemId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting budget income item:", error);
      res.status(500).json({ message: "Failed to delete budget income item" });
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
    console.log('Plaid create-link-token request received for org:', req.params.organizationId);
    try {
      const userId = req.user.claims.sub;
      console.log('User ID:', userId);
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

      const webhookBaseUrl = process.env.REPLIT_DOMAINS?.split(',')[0];
      const webhookUrl = webhookBaseUrl ? `https://${webhookBaseUrl}/api/plaid/webhook` : undefined;

      // Get organization to customize Link experience
      const organization = await storage.getOrganization(organizationId);
      
      // Optimize products array based on organization needs
      // - 'auth' is always needed for account verification and ACH details
      // - 'identity' is included for DCAA compliance (owner verification for government contracts)
      // - 'transactions' can be added if enabled in Plaid Dashboard
      // Note: Each additional product adds to API costs, so we only request what's needed
      const plaidProducts: string[] = ['auth'];
      
      // Add identity for nonprofits (grant compliance) and organizations with government contracts
      // Identity provides account owner information useful for audit trails
      if (organization?.type === 'nonprofit' || organization?.type === 'forprofit') {
        plaidProducts.push('identity');
      }
      
      // Transactions product - required for transaction syncing
      plaidProducts.push('transactions');
      
      console.log('Requesting Plaid products:', plaidProducts, 'for org type:', organization?.type);
      
      // Build Link configuration with conversion optimizations
      const linkConfig: any = {
        user: {
          client_user_id: userId,
        },
        client_name: 'ComplyBook',
        products: plaidProducts,
        country_codes: ['US' as any],
        language: 'en',
        webhook: webhookUrl,
        
        // Account selection: Allow multiple accounts for financial management use cases
        // This provides flexibility while avoiding overwhelming users
        account_filters: {
          depository: {
            account_subtypes: ['checking', 'savings', 'money market', 'cd'],
          },
          credit: {
            account_subtypes: ['credit card'],
          },
        },
        
        // Request up to 24 months (730 days) of transaction history
        // Default is only 90 days - we want more for comprehensive financial management
        transactions: {
          days_requested: 730,
        },
      };
      
      // Only enable microdeposit auth flows when 'auth' is the ONLY product
      // Plaid requires auth to be the sole product when microdeposits are enabled
      if (plaidProducts.length === 1 && plaidProducts[0] === 'auth') {
        linkConfig.auth = {
          // Enable Same Day Micro-deposits (1 business day, manual code entry)
          same_day_microdeposits_enabled: true,
          // Enable Instant Micro-deposits (RTP/FedNow - seconds, for supported banks)
          instant_microdeposits_enabled: true,
          // Enable Automated Micro-deposits (1-2 days, auto-verified)
          automated_microdeposits_enabled: true,
          // Enable Database Auth (instant validation against Plaid network)
          database_match_enabled: true,
        };
      }
      
      const response = await plaidClient.linkTokenCreate(linkConfig);

      // Log for troubleshooting (Plaid recommended identifiers)
      console.log(`[Plaid] Link token created - link_session_id: ${response.data.link_token.substring(0, 20)}..., org: ${organizationId}, request_id: ${response.data.request_id}`);

      res.json({ link_token: response.data.link_token });
    } catch (error: any) {
      console.error("Error creating link token:", error);
      if (error?.response?.data) {
        console.error("Plaid API error details:", JSON.stringify(error.response.data, null, 2));
      }
      const errorMessage = error?.response?.data?.error_message || "Failed to create link token";
      res.status(500).json({ message: errorMessage });
    }
  });

  // Create link token for update mode (re-authentication)
  app.post('/api/plaid/create-update-link-token/:itemId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const itemId = parseInt(req.params.itemId);

      // Get the Plaid item
      const plaidItem = await storage.getPlaidItem(itemId);
      if (!plaidItem) {
        return res.status(404).json({ message: "Plaid item not found" });
      }

      // Check user has access to the organization
      const userRole = await storage.getUserRole(userId, plaidItem.organizationId);
      if (!userRole || !['owner', 'admin'].includes(userRole.role)) {
        return res.status(403).json({ message: "Only owners and admins can update bank connections" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const webhookBaseUrl = process.env.REPLIT_DOMAINS?.split(',')[0];
      const webhookUrl = webhookBaseUrl ? `https://${webhookBaseUrl}/api/plaid/webhook` : undefined;

      // Create link token in update mode by passing access_token
      const response = await plaidClient.linkTokenCreate({
        user: {
          client_user_id: userId,
        },
        client_name: 'ComplyBook',
        access_token: plaidItem.accessToken,
        country_codes: ['US' as any],
        language: 'en',
        webhook: webhookUrl,
      });

      // Log for troubleshooting (Plaid recommended identifiers)
      console.log(`[Plaid] Update link token created - item_id: ${plaidItem.itemId}, request_id: ${response.data.request_id}`);

      res.json({ link_token: response.data.link_token });
    } catch (error) {
      console.error("Error creating update link token:", error);
      res.status(500).json({ message: "Failed to create update link token" });
    }
  });

  // Log Plaid Link events for conversion analytics
  // Allowed fields whitelist - ONLY these fields are logged, everything else is stripped
  const PLAID_EVENT_ALLOWED_FIELDS = [
    'viewName', 'institutionId', 'errorType', 'errorCode', 
    'exitStatus', 'accountsCount', 'mfaType', 'mode'
  ];

  app.post('/api/plaid/log-event/:organizationId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);
      const { eventName, metadata } = req.body;

      // Validate eventName
      if (!eventName || typeof eventName !== 'string') {
        return res.json({ success: true }); // Silent fail for invalid events
      }

      // Check user has access to this organization
      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Build sanitized metadata using ONLY whitelisted fields
      // This ensures no PII (session IDs, search queries, names) can ever be logged
      const sanitizedMetadata: Record<string, any> = {
        eventName: eventName.substring(0, 50), // Truncate for safety
      };

      if (metadata && typeof metadata === 'object') {
        for (const field of PLAID_EVENT_ALLOWED_FIELDS) {
          const value = metadata[field];
          if (value !== undefined && value !== null) {
            // Type validation for each allowed field
            if (field === 'accountsCount') {
              if (typeof value === 'number' && value >= 0 && value <= 100) {
                sanitizedMetadata[field] = value;
              }
            } else if (typeof value === 'string' && value.length <= 100) {
              sanitizedMetadata[field] = value;
            }
          }
        }
      }

      // Log to audit log for NIST AU compliance
      await storage.createAuditLog({
        organizationId,
        userId,
        action: 'create',
        entityType: 'plaid_link',
        entityId: `event_${Date.now()}`,
        newValues: sanitizedMetadata,
        changes: `Plaid Link event: ${sanitizedMetadata.eventName}`,
        ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error logging Plaid event:", error);
      // Return success anyway - don't fail the user flow for analytics
      res.json({ success: true });
    }
  });

  app.post('/api/plaid/exchange-token/:organizationId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);
      const { public_token, metadata } = req.body;

      // Check user has access to this organization
      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole || !['owner', 'admin'].includes(userRole.role)) {
        return res.status(403).json({ message: "Only owners and admins can connect bank accounts" });
      }

      // --- Duplicate Item Detection ---
      // Check for duplicate institution connection before exchanging token
      const existingItems = await storage.getPlaidItems(organizationId);
      
      // If metadata is provided from onSuccess callback, check for duplicates
      if (metadata?.institution?.institution_id) {
        const duplicateInstitution = existingItems.find(
          item => item.institutionId === metadata.institution.institution_id && item.status !== 'error'
        );
        
        if (duplicateInstitution) {
          console.log(`[DUPLICATE DETECTION] Institution ${metadata.institution.name} already connected for org ${organizationId}`);
          return res.status(409).json({ 
            message: `This bank (${metadata.institution.name || 'institution'}) is already connected. To reconnect, please remove the existing connection first.`,
            isDuplicate: true,
            existingItemId: duplicateInstitution.id,
            institutionName: duplicateInstitution.institutionName
          });
        }
      }

      // Exchange public token for access token
      const tokenResponse = await plaidClient.itemPublicTokenExchange({
        public_token,
      });

      const accessToken = tokenResponse.data.access_token;
      const itemId = tokenResponse.data.item_id;

      // Log for troubleshooting (Plaid recommended identifiers)
      console.log(`[Plaid] Token exchanged - item_id: ${itemId}, request_id: ${tokenResponse.data.request_id}, org: ${organizationId}`);

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

      // Secondary duplicate check after token exchange (in case metadata wasn't provided)
      if (institutionId) {
        const duplicateInstitution = existingItems.find(
          item => item.institutionId === institutionId && item.status !== 'error'
        );
        
        if (duplicateInstitution) {
          console.log(`[DUPLICATE DETECTION] Post-exchange: Institution ${institutionId} already connected for org ${organizationId}`);
          // Remove the newly created item from Plaid to avoid orphaned connections
          try {
            await plaidClient.itemRemove({ access_token: accessToken });
            console.log(`[DUPLICATE DETECTION] Removed duplicate Plaid item ${itemId}`);
          } catch (removeError) {
            console.error(`[DUPLICATE DETECTION] Failed to remove duplicate item:`, removeError);
          }
          return res.status(409).json({ 
            message: `This bank (${institutionName || 'institution'}) is already connected. To reconnect, please remove the existing connection first.`,
            isDuplicate: true,
            existingItemId: duplicateInstitution.id,
            institutionName: duplicateInstitution.institutionName
          });
        }
      }

      // Get accounts before storing to check for account-level duplicates
      const accountsResponse = await plaidClient.accountsGet({
        access_token: accessToken,
      });

      // Log for troubleshooting (Plaid recommended identifiers)
      const accountIds = accountsResponse.data.accounts.map(a => a.account_id).join(', ');
      console.log(`[Plaid] Accounts fetched - item_id: ${itemId}, account_ids: [${accountIds}], request_id: ${accountsResponse.data.request_id}`);

      // Check for duplicate accounts by mask + type across all existing accounts
      const existingAccounts = await storage.getAllPlaidAccounts(organizationId);
      const newAccounts = accountsResponse.data.accounts;
      
      const duplicateAccounts = newAccounts.filter(newAcc => 
        existingAccounts.some(existingAcc => 
          existingAcc.mask === newAcc.mask && 
          existingAcc.type === newAcc.type &&
          existingAcc.name?.toLowerCase() === newAcc.name?.toLowerCase()
        )
      );

      if (duplicateAccounts.length > 0) {
        console.log(`[DUPLICATE DETECTION] Found ${duplicateAccounts.length} duplicate accounts for org ${organizationId}`);
        // Log but don't block - user might be reconnecting with different credentials
        // This is informational for now
      }

      // Store the Plaid item (access token is encrypted by storage layer)
      const plaidItem = await storage.createPlaidItem({
        organizationId,
        itemId,
        accessToken,
        institutionId,
        institutionName,
        createdBy: userId,
      });

      // Store accounts (including persistent_account_id if available)
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
          persistentAccountId: (account as any).persistent_account_id || null,
        });
      }

      res.json({ 
        success: true, 
        accounts: accountsResponse.data.accounts.length,
        duplicateAccountsWarning: duplicateAccounts.length > 0 ? 
          `${duplicateAccounts.length} account(s) may already be connected under a different bank connection.` : null
      });
    } catch (error) {
      console.error("Error exchanging token:", error);
      res.status(500).json({ message: "Failed to connect bank account" });
    }
  });

  // Get Plaid items (bank connections) with status for update mode detection
  app.get('/api/plaid/items/:organizationId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);

      // Check user has access to this organization
      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      const items = await storage.getPlaidItems(organizationId);
      res.json(items);
    } catch (error) {
      console.error("Error fetching Plaid items:", error);
      res.status(500).json({ message: "Failed to fetch bank connections" });
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

  // Update account initial balance
  app.patch('/api/plaid/account/:accountId/initial-balance', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const accountId = req.params.accountId;
      const { initialBalance, initialBalanceDate } = req.body;

      // Validate request body
      if (!initialBalance || !initialBalanceDate) {
        return res.status(400).json({ message: "Initial balance and date are required" });
      }

      const parsedBalance = parseFloat(initialBalance);
      if (isNaN(parsedBalance)) {
        return res.status(400).json({ message: "Initial balance must be a valid number" });
      }

      // Get the Plaid account to find the item/organization
      const account = await storage.getPlaidAccountByAccountId(accountId);
      if (!account) {
        return res.status(404).json({ message: "Account not found" });
      }

      // Get plaid item to check organization access
      const plaidItem = await storage.getPlaidItem(account.plaidItemId.toString());
      if (!plaidItem) {
        return res.status(404).json({ message: "Bank connection not found" });
      }

      // Check user has access to this organization
      const userRole = await storage.getUserRole(userId, plaidItem.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      // Update the initial balance
      await storage.updatePlaidAccountInitialBalance(accountId, parsedBalance.toFixed(2), initialBalanceDate);

      res.json({ success: true });
    } catch (error) {
      console.error("Error updating initial balance:", error);
      res.status(500).json({ message: "Failed to update initial balance" });
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
        const removeResponse = await plaidClient.itemRemove({
          access_token: plaidItem.accessToken,
        });
        // Log for troubleshooting (Plaid recommended identifiers)
        console.log(`[Plaid] Item removed - item_id: ${plaidItem.itemId}, request_id: ${removeResponse.data.request_id}`);
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
      const errors: Array<{ institution: string; error: string }> = [];

      // Sync transactions for each plaid item using cursor-based incremental sync
      for (const plaidItem of plaidItems) {
        try {
          let cursor = plaidItem.cursor || undefined;
          let hasMore = true;
          let addedTransactions: any[] = [];
          let modifiedTransactions: any[] = [];
          let removedTransactionIds: string[] = [];
          let accounts: any[] = [];

          // Use transactionsSync for incremental updates (much faster than transactionsGet)
          while (hasMore) {
            const syncResponse = await plaidClient.transactionsSync({
              access_token: plaidItem.accessToken,
              cursor: cursor,
              count: 500,
            });

            const data = syncResponse.data;
            addedTransactions = addedTransactions.concat(data.added);
            modifiedTransactions = modifiedTransactions.concat(data.modified);
            removedTransactionIds = removedTransactionIds.concat(data.removed.map((r: any) => r.transaction_id));
            if (data.accounts && data.accounts.length > 0) {
              accounts = data.accounts;
            }
            
            hasMore = data.has_more;
            cursor = data.next_cursor;
          }

          // Log for troubleshooting
          console.log(`[Plaid Sync] item_id: ${plaidItem.itemId}, added: ${addedTransactions.length}, modified: ${modifiedTransactions.length}, removed: ${removedTransactionIds.length}`);

          // Update account balances (batch operation)
          const balanceUpdates = accounts.map(account => 
            storage.updatePlaidAccountBalances(
              account.account_id,
              account.balances.current?.toString() || '0',
              account.balances.available?.toString() || '0'
            )
          );
          await Promise.all(balanceUpdates);

          // Pre-fetch all plaid accounts for this item to avoid repeated lookups
          const plaidAccountsMap = new Map<string, any>();
          const allPlaidAccounts = await storage.getPlaidAccounts(plaidItem.id);
          for (const acc of allPlaidAccounts) {
            plaidAccountsMap.set(acc.accountId, acc);
          }

          // OPTIMIZATION: Batch fetch all existing external IDs at once
          const allExternalIds = addedTransactions.map((tx: any) => tx.transaction_id);
          const existingByExternalId = await storage.getTransactionsByExternalIds(organizationId, allExternalIds);

          // OPTIMIZATION: Batch fetch potential duplicates for date range
          let minDate: Date | null = null;
          let maxDate: Date | null = null;
          for (const tx of addedTransactions) {
            const d = new Date(tx.date);
            if (!minDate || d < minDate) minDate = d;
            if (!maxDate || d > maxDate) maxDate = d;
          }
          
          let potentialDuplicates: any[] = [];
          if (minDate && maxDate) {
            // Extend range by 1 day on each side for matching
            const startDate = new Date(minDate);
            startDate.setDate(startDate.getDate() - 1);
            const endDate = new Date(maxDate);
            endDate.setDate(endDate.getDate() + 1);
            potentialDuplicates = await storage.findPotentialDuplicateTransactions(organizationId, startDate, endDate);
          }

          // Build lookup maps for fast duplicate checking
          const duplicatesByKey = new Map<string, any[]>();
          for (const tx of potentialDuplicates) {
            const dateKey = new Date(tx.date).toISOString().split('T')[0];
            const key = `${dateKey}|${tx.amount}|${tx.type}`;
            if (!duplicatesByKey.has(key)) duplicatesByKey.set(key, []);
            duplicatesByKey.get(key)!.push(tx);
          }

          // Process new transactions with batch-fetched data
          const transactionsToCreate: any[] = [];
          const transactionsToUpdate: { id: number; updates: any }[] = [];

          for (const plaidTx of addedTransactions) {
            // Check if already imported (using batch-fetched map)
            if (existingByExternalId.has(plaidTx.transaction_id)) continue;

            const isIncome = plaidTx.amount < 0;
            const amount = Math.abs(plaidTx.amount);
            const transactionDate = new Date(plaidTx.date);
            const dateKey = transactionDate.toISOString().split('T')[0];
            const key = `${dateKey}|${amount.toString()}|${isIncome ? 'income' : 'expense'}`;

            const plaidAccount = plaidAccountsMap.get(plaidTx.account_id);

            // Check for matching manual transaction (from batch-fetched data)
            const candidates = duplicatesByKey.get(key) || [];
            const manualMatch = candidates.find((tx: any) => 
              !tx.externalId && (tx.source === 'manual' || !tx.source)
            );

            if (manualMatch) {
              transactionsToUpdate.push({
                id: manualMatch.id,
                updates: {
                  externalId: plaidTx.transaction_id,
                  source: 'plaid',
                  bankAccountId: plaidAccount?.id ?? null,
                }
              });
              console.log(`[Plaid Sync] Linked existing manual transaction ${manualMatch.id} to Plaid transaction ${plaidTx.transaction_id}`);
              totalImported++;
              continue;
            }

            // Check for any matching transaction (from batch-fetched data)
            if (candidates.length > 0) continue;

            // Queue new transaction for batch creation
            transactionsToCreate.push({
              organizationId,
              date: transactionDate,
              description: plaidTx.name,
              amount: amount.toString(),
              type: isIncome ? 'income' : 'expense',
              categoryId: null,
              grantId: null,
              createdBy: userId,
              source: 'plaid',
              externalId: plaidTx.transaction_id,
              bankAccountId: plaidAccount?.id ?? null,
            });

            totalImported++;
          }

          // Execute batch updates
          await Promise.all(transactionsToUpdate.map(({ id, updates }) => 
            storage.updateTransaction(id, updates)
          ));

          // Execute batch creates (parallel chunks of 50)
          const BATCH_SIZE = 50;
          for (let i = 0; i < transactionsToCreate.length; i += BATCH_SIZE) {
            const batch = transactionsToCreate.slice(i, i + BATCH_SIZE);
            await Promise.all(batch.map(tx => storage.createTransaction(tx)));
          }

          // Handle modified transactions (batch lookup + parallel updates)
          let totalModified = 0;
          if (modifiedTransactions.length > 0) {
            const modifiedIds = modifiedTransactions.map((tx: any) => tx.transaction_id);
            const existingModified = await storage.getTransactionsByExternalIds(organizationId, modifiedIds);
            
            const modifyUpdates = modifiedTransactions
              .filter((plaidTx: any) => existingModified.has(plaidTx.transaction_id))
              .map((plaidTx: any) => {
                const existingTx = existingModified.get(plaidTx.transaction_id)!;
                const isIncome = plaidTx.amount < 0;
                const amount = Math.abs(plaidTx.amount);
                const transactionDate = new Date(plaidTx.date);
                
                console.log(`[Plaid Sync] Updated transaction ${existingTx.id} from Plaid ${plaidTx.transaction_id}`);
                totalModified++;
                
                return storage.updateTransaction(existingTx.id, {
                  description: plaidTx.name,
                  amount: amount.toString(),
                  type: isIncome ? 'income' : 'expense',
                  date: transactionDate,
                });
              });
            
            await Promise.all(modifyUpdates);
          }

          // Handle removed transactions (batch lookup + parallel updates)
          let totalRemoved = 0;
          if (removedTransactionIds.length > 0) {
            const existingRemoved = await storage.getTransactionsByExternalIds(organizationId, removedTransactionIds);
            
            const removeUpdates = removedTransactionIds
              .filter((removedId: string) => existingRemoved.has(removedId))
              .map((removedId: string) => {
                const existingTx = existingRemoved.get(removedId)!;
                // Guard against repeated prefixing on subsequent syncs
                const alreadyMarked = existingTx.description?.startsWith('[REMOVED BY BANK]');
                if (!alreadyMarked) {
                  console.log(`[Plaid Sync] Marked transaction ${existingTx.id} as removed (Plaid: ${removedId})`);
                  totalRemoved++;
                  return storage.updateTransaction(existingTx.id, {
                    description: `[REMOVED BY BANK] ${existingTx.description}`,
                    reconciliationStatus: 'excluded',
                  });
                }
                return Promise.resolve();
              });
            
            await Promise.all(removeUpdates);
          }

          if (totalModified > 0 || totalRemoved > 0) {
            console.log(`[Plaid Sync] item_id: ${plaidItem.itemId}, modified: ${totalModified}, removed: ${totalRemoved}`);
          }

          // Save cursor only after all processing is complete (data integrity)
          if (cursor) {
            await storage.updatePlaidItemCursor(plaidItem.id, cursor);
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

  // Plaid Auth - Get account and routing numbers for ACH transfers
  app.post('/api/plaid/auth/:organizationId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);

      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole || !['owner', 'admin'].includes(userRole.role)) {
        return res.status(403).json({ message: "Only owners and admins can access bank account numbers" });
      }

      const plaidItems = await storage.getPlaidItems(organizationId);
      if (plaidItems.length === 0) {
        return res.status(404).json({ message: "No bank accounts connected" });
      }

      const authData: Array<{
        institutionName: string | null;
        accounts: Array<{
          accountId: string;
          name: string;
          mask: string | null;
          accountNumber: string | null;
          routingNumber: string | null;
          wireRoutingNumber: string | null;
        }>;
      }> = [];

      for (const plaidItem of plaidItems) {
        try {
          const authResponse = await plaidClient.authGet({
            access_token: plaidItem.accessToken,
          });

          const itemAuthData: typeof authData[0] = {
            institutionName: plaidItem.institutionName,
            accounts: [],
          };

          for (const account of authResponse.data.accounts) {
            const numbers = authResponse.data.numbers;
            let accountNumber: string | null = null;
            let routingNumber: string | null = null;
            let wireRoutingNumber: string | null = null;

            const achNumbers = numbers.ach?.find(n => n.account_id === account.account_id);
            if (achNumbers) {
              accountNumber = achNumbers.account;
              routingNumber = achNumbers.routing;
              wireRoutingNumber = achNumbers.wire_routing || null;
            }

            const eftNumbers = numbers.eft?.find(n => n.account_id === account.account_id);
            if (eftNumbers && !accountNumber) {
              accountNumber = eftNumbers.account;
              routingNumber = eftNumbers.branch;
            }

            await storage.updatePlaidAccountAuth(account.account_id, {
              accountNumber,
              routingNumber,
              wireRoutingNumber,
            });

            itemAuthData.accounts.push({
              accountId: account.account_id,
              name: account.name,
              mask: account.mask || null,
              accountNumber: accountNumber ? `****${accountNumber.slice(-4)}` : null,
              routingNumber,
              wireRoutingNumber,
            });
          }

          authData.push(itemAuthData);
        } catch (error: any) {
          console.error(`Error fetching auth for item ${plaidItem.itemId}:`, error);
          if (error?.response?.data?.error_code === 'PRODUCTS_NOT_READY') {
            authData.push({
              institutionName: plaidItem.institutionName,
              accounts: [],
            });
          }
        }
      }

      res.json({ authData });
    } catch (error) {
      console.error("Error fetching auth data:", error);
      res.status(500).json({ message: "Failed to fetch account numbers" });
    }
  });

  // Plaid Identity - Get account holder information
  app.post('/api/plaid/identity/:organizationId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);

      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole || !['owner', 'admin'].includes(userRole.role)) {
        return res.status(403).json({ message: "Only owners and admins can access identity information" });
      }

      const plaidItems = await storage.getPlaidItems(organizationId);
      if (plaidItems.length === 0) {
        return res.status(404).json({ message: "No bank accounts connected" });
      }

      const identityData: Array<{
        institutionName: string | null;
        accounts: Array<{
          accountId: string;
          name: string;
          mask: string | null;
          owners: Array<{
            names: string[];
            emails: Array<{ data: string; primary: boolean; type: string }>;
            phoneNumbers: Array<{ data: string; primary: boolean; type: string }>;
            addresses: Array<{ data: any; primary: boolean }>;
          }>;
        }>;
      }> = [];

      for (const plaidItem of plaidItems) {
        try {
          const identityResponse = await plaidClient.identityGet({
            access_token: plaidItem.accessToken,
          });

          const itemIdentityData: typeof identityData[0] = {
            institutionName: plaidItem.institutionName,
            accounts: [],
          };

          for (const account of identityResponse.data.accounts) {
            const owners = account.owners || [];
            
            const ownerNames: string[] = [];
            const ownerEmails: string[] = [];
            const ownerPhoneNumbers: string[] = [];
            const ownerAddresses: any[] = [];

            for (const owner of owners) {
              ownerNames.push(...(owner.names || []));
              ownerEmails.push(...(owner.emails || []).map(e => e.data));
              ownerPhoneNumbers.push(...(owner.phone_numbers || []).map(p => p.data));
              ownerAddresses.push(...(owner.addresses || []).map(a => a.data));
            }

            await storage.updatePlaidAccountIdentity(account.account_id, {
              ownerNames,
              ownerEmails,
              ownerPhoneNumbers,
              ownerAddresses,
            });

            itemIdentityData.accounts.push({
              accountId: account.account_id,
              name: account.name,
              mask: account.mask || null,
              owners: owners.map(owner => ({
                names: owner.names || [],
                emails: (owner.emails || []).map(e => ({ data: e.data, primary: e.primary, type: e.type })),
                phoneNumbers: (owner.phone_numbers || []).map(p => ({ data: p.data, primary: p.primary, type: p.type })),
                addresses: (owner.addresses || []).map(a => ({ data: a.data, primary: a.primary })),
              })),
            });
          }

          identityData.push(itemIdentityData);
        } catch (error: any) {
          console.error(`Error fetching identity for item ${plaidItem.itemId}:`, error);
          if (error?.response?.data?.error_code === 'PRODUCTS_NOT_READY') {
            identityData.push({
              institutionName: plaidItem.institutionName,
              accounts: [],
            });
          }
        }
      }

      res.json({ identityData });
    } catch (error) {
      console.error("Error fetching identity data:", error);
      res.status(500).json({ message: "Failed to fetch identity information" });
    }
  });

  // Invoice routes
  
  // Get next invoice number for organization
  app.get('/api/invoices/:organizationId/next-number', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);
      
      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      const invoices = await storage.getInvoices(organizationId);
      
      // Find the highest invoice number and increment
      let maxNumber = 0;
      for (const invoice of invoices) {
        // Extract number from invoice number (handles formats like "INV-001", "001", "1")
        const match = invoice.invoiceNumber.match(/(\d+)/);
        if (match) {
          const num = parseInt(match[1]);
          if (num > maxNumber) {
            maxNumber = num;
          }
        }
      }
      
      const nextNumber = maxNumber + 1;
      const nextInvoiceNumber = `INV-${nextNumber.toString().padStart(3, '0')}`;
      
      res.json({ nextInvoiceNumber });
    } catch (error) {
      console.error("Error getting next invoice number:", error);
      res.status(500).json({ message: "Failed to get next invoice number" });
    }
  });

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

      const baseUrl = `${req.protocol}://${req.get('host')}`;
      let paymentUrl: string | undefined;
      let stripeSessionId: string | undefined;

      // Create Stripe checkout session for payment
      try {
        const checkoutResult = await createInvoiceCheckoutSession({
          invoiceId,
          invoiceNumber: invoice.invoiceNumber,
          amount: Number(invoice.totalAmount),
          customerEmail: recipientEmail,
          customerName: customer.name,
          organizationId: invoice.organizationId,
          organizationName: organization.name,
          successUrl: `${baseUrl}/invoice-paid?session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${baseUrl}/`,
        });
        paymentUrl = checkoutResult.paymentUrl;
        stripeSessionId = checkoutResult.sessionId;
      } catch (stripeError) {
        console.error("Error creating Stripe checkout session:", stripeError);
        // Continue without payment link
      }

      // Generate PDF attachment
      let pdfBuffer: Buffer | undefined;
      try {
        pdfBuffer = await generateInvoicePdf({
          invoiceNumber: invoice.invoiceNumber,
          invoiceDate: new Date(invoice.issueDate).toLocaleDateString(),
          dueDate: new Date(invoice.dueDate).toLocaleDateString(),
          amount: Number(invoice.totalAmount),
          customerName: customer.name,
          customerEmail: recipientEmail,
          organizationName: organization.name,
          organizationEmail: organization.companyEmail || undefined,
          organizationPhone: organization.companyPhone || undefined,
          organizationAddress: organization.companyAddress || undefined,
          items: lineItems.map(item => ({
            description: item.description,
            quantity: Number(item.quantity),
            unitPrice: Number(item.rate),
            total: Number(item.amount)
          })),
          notes: invoice.notes || undefined,
          paymentUrl,
          branding: {
            primaryColor: organization.invoicePrimaryColor || undefined,
            accentColor: organization.invoiceAccentColor || undefined,
            fontFamily: organization.invoiceFontFamily || undefined,
            logoUrl,
            footer: organization.invoiceFooter || undefined
          }
        });
      } catch (pdfError) {
        console.error("Error generating invoice PDF:", pdfError);
        // Continue without PDF attachment
      }

      // Update invoice with payment info and status
      await storage.updateInvoice(invoiceId, { 
        status: 'emailed',
        stripeCheckoutSessionId: stripeSessionId || null,
        paymentUrl: paymentUrl || null
      });

      // Try to send email
      try {
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
          paymentUrl,
          pdfBuffer,
          branding: {
            primaryColor: organization.invoicePrimaryColor || undefined,
            accentColor: organization.invoiceAccentColor || undefined,
            fontFamily: organization.invoiceFontFamily || undefined,
            logoUrl,
            footer: organization.invoiceFooter || undefined
          }
        });
      } catch (emailError) {
        console.error("Error sending invoice email (status still updated):", emailError);
        // Continue - status was already updated
      }

      // Log audit trail
      await storage.logAuditTrail({
        organizationId: invoice.organizationId,
        userId,
        entityType: 'invoice',
        entityId: invoiceId.toString(),
        action: 'update',
        oldValues: { status: invoice.status },
        newValues: { status: 'emailed', emailSentTo: recipientEmail, emailSentAt: new Date(), paymentUrl },
        ipAddress: req.ip || null,
        userAgent: req.get('user-agent') || null
      });

      res.json({ message: "Invoice sent successfully", paymentUrl });
    } catch (error) {
      console.error("Error sending invoice email:", error);
      res.status(500).json({ message: "Failed to send invoice email" });
    }
  });

  app.post('/api/invoices/:id/mark-printed', isAuthenticated, async (req: any, res) => {
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

      if (!hasPermission(userRole.role, userRole.permissions, 'edit_transactions')) {
        return res.status(403).json({ message: "You don't have permission to manage invoices" });
      }

      // Update invoice status to 'needs_to_be_mailed'
      await storage.updateInvoice(invoiceId, { status: 'needs_to_be_mailed' });

      // Log audit trail
      await storage.logAuditTrail({
        organizationId: invoice.organizationId,
        userId,
        entityType: 'invoice',
        entityId: invoiceId.toString(),
        action: 'update',
        oldValues: { status: invoice.status },
        newValues: { status: 'needs_to_be_mailed', markedPrintedAt: new Date() },
        ipAddress: req.ip || null,
        userAgent: req.get('user-agent') || null
      });

      res.json({ message: "Invoice marked for mailing successfully" });
    } catch (error) {
      console.error("Error marking invoice as printed:", error);
      res.status(500).json({ message: "Failed to mark invoice as printed" });
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

  // Record a payment for a bill
  app.post('/api/bills/:billId/payments', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const billId = parseInt(req.params.billId);
      
      if (isNaN(billId)) {
        return res.status(400).json({ message: "Invalid bill ID" });
      }

      // Validate request body with Zod schema
      const paymentSchema = z.object({
        amount: z.string().or(z.number()).transform(val => {
          const num = typeof val === 'string' ? parseFloat(val) : val;
          if (isNaN(num) || num <= 0) throw new Error("Amount must be a positive number");
          return num.toFixed(2);
        }),
        paymentMethod: z.enum(['ach', 'card', 'check', 'manual']),
        paymentDate: z.string().transform(val => {
          const date = new Date(val);
          if (isNaN(date.getTime())) throw new Error("Invalid date format");
          return date;
        }),
        checkNumber: z.string().max(50).optional().nullable(),
        referenceNumber: z.string().max(100).optional().nullable(),
        notes: z.string().optional().nullable(),
      });

      const validatedData = paymentSchema.parse(req.body);
      
      const bill = await storage.getBill(billId);
      if (!bill) {
        return res.status(404).json({ message: "Bill not found" });
      }

      // Verify user has access to THIS organization specifically
      const userOrgs = await storage.getOrganizations(userId);
      const hasOrgAccess = userOrgs.some(org => org.id === bill.organizationId);
      if (!hasOrgAccess) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      const userRole = await storage.getUserRole(userId, bill.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }
      
      if (!hasPermission(userRole.role, userRole.permissions, 'edit_transactions')) {
        return res.status(403).json({ message: "You don't have permission to record payments" });
      }

      // Check if bill is already fully paid
      if (bill.status === 'paid') {
        return res.status(400).json({ message: "Bill is already fully paid" });
      }

      // Check if bill is cancelled
      if (bill.status === 'cancelled') {
        return res.status(400).json({ message: "Cannot record payment for a cancelled bill" });
      }

      // Create the payment record
      const payment = await storage.createBillPayment({
        organizationId: bill.organizationId,
        billId,
        amount: validatedData.amount,
        paymentMethod: validatedData.paymentMethod,
        paymentDate: validatedData.paymentDate,
        checkNumber: validatedData.checkNumber || null,
        referenceNumber: validatedData.referenceNumber || null,
        notes: validatedData.notes || null,
        createdBy: userId,
      } as any);

      // Update bill status to paid if full amount is covered
      const allPayments = await storage.getBillPaymentsByBill(billId);
      const totalPaid = allPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
      const billTotal = parseFloat(bill.totalAmount);
      
      if (totalPaid >= billTotal) {
        await storage.updateBill(billId, { status: 'paid' });
      } else if (totalPaid > 0) {
        await storage.updateBill(billId, { status: 'partial' });
      }

      // Note: Bill payment recording is captured in the bill_payments table as an audit trail
      // Security event logging is reserved for authentication/authorization events

      res.status(201).json(payment);
    } catch (error: any) {
      console.error("Error recording payment:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0]?.message || "Invalid payment data" });
      }
      res.status(400).json({ message: error.message || "Failed to record payment" });
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
  // AUTO-PAY RULES ROUTES
  // ============================================

  app.get('/api/auto-pay-rules/:organizationId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);
      
      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      const rules = await storage.getAutoPayRules(organizationId);
      res.json(rules);
    } catch (error) {
      console.error("Error fetching auto-pay rules:", error);
      res.status(500).json({ message: "Failed to fetch auto-pay rules" });
    }
  });

  app.get('/api/auto-pay-rules/single/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const ruleId = parseInt(req.params.id);
      
      const rule = await storage.getAutoPayRule(ruleId);
      if (!rule) {
        return res.status(404).json({ message: "Auto-pay rule not found" });
      }

      const userRole = await storage.getUserRole(userId, rule.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      res.json(rule);
    } catch (error) {
      console.error("Error fetching auto-pay rule:", error);
      res.status(500).json({ message: "Failed to fetch auto-pay rule" });
    }
  });

  app.post('/api/auto-pay-rules', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      // Parse without createdBy since we'll set it from the authenticated user
      const ruleSchema = insertAutoPayRuleSchema.omit({ createdBy: true });
      const data = ruleSchema.parse(req.body);
      
      const userRole = await storage.getUserRole(userId, data.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }
      
      if (!hasPermission(userRole.role, userRole.permissions, 'edit_transactions')) {
        return res.status(403).json({ message: "You don't have permission to manage auto-pay rules" });
      }

      const rule = await storage.createAutoPayRule({
        ...data,
        createdBy: userId,
      } as any);
      res.status(201).json(rule);
    } catch (error) {
      console.error("Error creating auto-pay rule:", error);
      res.status(400).json({ message: "Failed to create auto-pay rule" });
    }
  });

  app.patch('/api/auto-pay-rules/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const ruleId = parseInt(req.params.id);
      const updates = insertAutoPayRuleSchema.partial().parse(req.body);

      const existingRule = await storage.getAutoPayRule(ruleId);
      if (!existingRule) {
        return res.status(404).json({ message: "Auto-pay rule not found" });
      }

      const userRole = await storage.getUserRole(userId, existingRule.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }
      
      if (!hasPermission(userRole.role, userRole.permissions, 'edit_transactions')) {
        return res.status(403).json({ message: "You don't have permission to manage auto-pay rules" });
      }

      const updatedRule = await storage.updateAutoPayRule(ruleId, updates);
      res.json(updatedRule);
    } catch (error) {
      console.error("Error updating auto-pay rule:", error);
      res.status(400).json({ message: "Failed to update auto-pay rule" });
    }
  });

  app.delete('/api/auto-pay-rules/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const ruleId = parseInt(req.params.id);

      const existingRule = await storage.getAutoPayRule(ruleId);
      if (!existingRule) {
        return res.status(404).json({ message: "Auto-pay rule not found" });
      }

      const userRole = await storage.getUserRole(userId, existingRule.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }
      
      if (!hasPermission(userRole.role, userRole.permissions, 'edit_transactions')) {
        return res.status(403).json({ message: "You don't have permission to manage auto-pay rules" });
      }

      await storage.deleteAutoPayRule(ruleId);
      res.json({ message: "Auto-pay rule deleted successfully" });
    } catch (error) {
      console.error("Error deleting auto-pay rule:", error);
      res.status(500).json({ message: "Failed to delete auto-pay rule" });
    }
  });

  app.get('/api/auto-pay-rules/active/:organizationId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);
      
      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      const rules = await storage.getActiveAutoPayRules(organizationId);
      res.json(rules);
    } catch (error) {
      console.error("Error fetching active auto-pay rules:", error);
      res.status(500).json({ message: "Failed to fetch active auto-pay rules" });
    }
  });

  app.post('/api/auto-pay-rules/check-bill/:billId', isAuthenticated, async (req: any, res) => {
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

      const matchingRules = await storage.getMatchingAutoPayRules(bill);
      res.json(matchingRules);
    } catch (error) {
      console.error("Error checking auto-pay rules for bill:", error);
      res.status(500).json({ message: "Failed to check auto-pay rules" });
    }
  });

  // ============================================
  // SCHEDULED PAYMENT ROUTES
  // ============================================

  app.get('/api/scheduled-payments/:organizationId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);
      
      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      const payments = await storage.getScheduledPayments(organizationId);
      res.json(payments);
    } catch (error) {
      console.error("Error fetching scheduled payments:", error);
      res.status(500).json({ message: "Failed to fetch scheduled payments" });
    }
  });

  app.get('/api/scheduled-payments/single/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const paymentId = parseInt(req.params.id);
      
      const payment = await storage.getScheduledPayment(paymentId);
      if (!payment) {
        return res.status(404).json({ message: "Scheduled payment not found" });
      }

      const userRole = await storage.getUserRole(userId, payment.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      res.json(payment);
    } catch (error) {
      console.error("Error fetching scheduled payment:", error);
      res.status(500).json({ message: "Failed to fetch scheduled payment" });
    }
  });

  app.post('/api/scheduled-payments', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const data = insertScheduledPaymentSchema.parse(req.body);
      
      const userRole = await storage.getUserRole(userId, data.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }
      
      if (!hasPermission(userRole.role, userRole.permissions, 'edit_transactions')) {
        return res.status(403).json({ message: "You don't have permission to schedule payments" });
      }

      const payment = await storage.createScheduledPayment({
        ...data,
        createdBy: userId,
      });
      res.status(201).json(payment);
    } catch (error) {
      console.error("Error creating scheduled payment:", error);
      res.status(400).json({ message: "Failed to create scheduled payment" });
    }
  });

  app.patch('/api/scheduled-payments/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const paymentId = parseInt(req.params.id);
      const updates = insertScheduledPaymentSchema.partial().parse(req.body);

      const existingPayment = await storage.getScheduledPayment(paymentId);
      if (!existingPayment) {
        return res.status(404).json({ message: "Scheduled payment not found" });
      }

      // Cannot modify processed or cancelled payments
      if (existingPayment.status === 'completed' || existingPayment.status === 'cancelled') {
        return res.status(400).json({ message: "Cannot modify completed or cancelled payments" });
      }

      const userRole = await storage.getUserRole(userId, existingPayment.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }
      
      if (!hasPermission(userRole.role, userRole.permissions, 'edit_transactions')) {
        return res.status(403).json({ message: "You don't have permission to manage scheduled payments" });
      }

      const updatedPayment = await storage.updateScheduledPayment(paymentId, updates);
      res.json(updatedPayment);
    } catch (error) {
      console.error("Error updating scheduled payment:", error);
      res.status(400).json({ message: "Failed to update scheduled payment" });
    }
  });

  app.delete('/api/scheduled-payments/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const paymentId = parseInt(req.params.id);

      const existingPayment = await storage.getScheduledPayment(paymentId);
      if (!existingPayment) {
        return res.status(404).json({ message: "Scheduled payment not found" });
      }

      // Cannot delete processed payments
      if (existingPayment.status === 'completed') {
        return res.status(400).json({ message: "Cannot delete completed payments" });
      }

      const userRole = await storage.getUserRole(userId, existingPayment.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }
      
      if (!hasPermission(userRole.role, userRole.permissions, 'edit_transactions')) {
        return res.status(403).json({ message: "You don't have permission to manage scheduled payments" });
      }

      await storage.deleteScheduledPayment(paymentId);
      res.json({ message: "Scheduled payment deleted successfully" });
    } catch (error) {
      console.error("Error deleting scheduled payment:", error);
      res.status(500).json({ message: "Failed to delete scheduled payment" });
    }
  });

  app.get('/api/scheduled-payments/pending/:organizationId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);
      const beforeDate = req.query.beforeDate ? new Date(req.query.beforeDate as string) : undefined;
      
      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      const payments = await storage.getPendingScheduledPayments(organizationId, beforeDate);
      res.json(payments);
    } catch (error) {
      console.error("Error fetching pending scheduled payments:", error);
      res.status(500).json({ message: "Failed to fetch pending scheduled payments" });
    }
  });

  app.get('/api/scheduled-payments/bill/:billId', isAuthenticated, async (req: any, res) => {
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

      const payments = await storage.getScheduledPaymentsByBill(billId);
      res.json(payments);
    } catch (error) {
      console.error("Error fetching scheduled payments for bill:", error);
      res.status(500).json({ message: "Failed to fetch scheduled payments for bill" });
    }
  });

  app.post('/api/scheduled-payments/:id/cancel', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const paymentId = parseInt(req.params.id);

      const existingPayment = await storage.getScheduledPayment(paymentId);
      if (!existingPayment) {
        return res.status(404).json({ message: "Scheduled payment not found" });
      }

      if (existingPayment.status !== 'pending') {
        return res.status(400).json({ message: "Can only cancel pending payments" });
      }

      const userRole = await storage.getUserRole(userId, existingPayment.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }
      
      if (!hasPermission(userRole.role, userRole.permissions, 'edit_transactions')) {
        return res.status(403).json({ message: "You don't have permission to manage scheduled payments" });
      }

      const updatedPayment = await storage.updateScheduledPayment(paymentId, { status: 'cancelled' });
      res.json(updatedPayment);
    } catch (error) {
      console.error("Error cancelling scheduled payment:", error);
      res.status(500).json({ message: "Failed to cancel scheduled payment" });
    }
  });

  // ============================================
  // BILL PAYMENT ROUTES
  // ============================================

  app.get('/api/bill-payments/:organizationId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);
      
      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      const payments = await storage.getBillPayments(organizationId);
      res.json(payments);
    } catch (error) {
      console.error("Error fetching bill payments:", error);
      res.status(500).json({ message: "Failed to fetch bill payments" });
    }
  });

  app.get('/api/bill-payments/single/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const paymentId = parseInt(req.params.id);
      
      const payment = await storage.getBillPayment(paymentId);
      if (!payment) {
        return res.status(404).json({ message: "Bill payment not found" });
      }

      const userRole = await storage.getUserRole(userId, payment.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      res.json(payment);
    } catch (error) {
      console.error("Error fetching bill payment:", error);
      res.status(500).json({ message: "Failed to fetch bill payment" });
    }
  });

  app.post('/api/bill-payments', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const data = insertBillPaymentSchema.parse(req.body);
      
      const userRole = await storage.getUserRole(userId, data.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }
      
      if (!hasPermission(userRole.role, userRole.permissions, 'edit_transactions')) {
        return res.status(403).json({ message: "You don't have permission to record payments" });
      }

      // Verify bill exists
      const bill = await storage.getBill(data.billId);
      if (!bill) {
        return res.status(404).json({ message: "Bill not found" });
      }

      if (bill.organizationId !== data.organizationId) {
        return res.status(400).json({ message: "Bill does not belong to this organization" });
      }

      const payment = await storage.createBillPayment({
        ...data,
        createdBy: userId,
      });
      res.status(201).json(payment);
    } catch (error) {
      console.error("Error creating bill payment:", error);
      res.status(400).json({ message: "Failed to create bill payment" });
    }
  });

  app.get('/api/bill-payments/bill/:billId', isAuthenticated, async (req: any, res) => {
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

      const payments = await storage.getBillPaymentsByBill(billId);
      const totalPaid = await storage.getTotalPaidForBill(billId);
      res.json({ payments, totalPaid });
    } catch (error) {
      console.error("Error fetching payments for bill:", error);
      res.status(500).json({ message: "Failed to fetch payments for bill" });
    }
  });

  // ============================================
  // VENDOR PAYMENT DETAILS ROUTES
  // ============================================

  app.get('/api/vendor-payment-details/:vendorId/:organizationId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const vendorId = parseInt(req.params.vendorId);
      const organizationId = parseInt(req.params.organizationId);
      
      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }

      const details = await storage.getVendorPaymentDetails(vendorId, organizationId);
      res.json(details || null);
    } catch (error) {
      console.error("Error fetching vendor payment details:", error);
      res.status(500).json({ message: "Failed to fetch vendor payment details" });
    }
  });

  app.post('/api/vendor-payment-details', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const data = insertVendorPaymentDetailsSchema.parse(req.body);
      
      const userRole = await storage.getUserRole(userId, data.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }
      
      if (!hasPermission(userRole.role, userRole.permissions, 'edit_transactions')) {
        return res.status(403).json({ message: "You don't have permission to manage vendor payment details" });
      }

      // Check if details already exist
      const existing = await storage.getVendorPaymentDetails(data.vendorId, data.organizationId);
      if (existing) {
        return res.status(400).json({ message: "Vendor payment details already exist. Use PATCH to update." });
      }

      const details = await storage.createVendorPaymentDetails(data);
      res.status(201).json(details);
    } catch (error) {
      console.error("Error creating vendor payment details:", error);
      res.status(400).json({ message: "Failed to create vendor payment details" });
    }
  });

  app.patch('/api/vendor-payment-details/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const detailsId = parseInt(req.params.id);
      const updates = insertVendorPaymentDetailsSchema.partial().parse(req.body);

      // Get existing details first
      const existingDetails = await storage.getVendorPaymentDetails(0, 0); // Need to find by ID
      // Use a workaround since we need to get by ID
      const allVendors = await storage.getVendors(updates.organizationId || 0);
      
      if (!updates.organizationId) {
        return res.status(400).json({ message: "Organization ID required" });
      }

      const userRole = await storage.getUserRole(userId, updates.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }
      
      if (!hasPermission(userRole.role, userRole.permissions, 'edit_transactions')) {
        return res.status(403).json({ message: "You don't have permission to manage vendor payment details" });
      }

      const updatedDetails = await storage.updateVendorPaymentDetails(detailsId, updates);
      res.json(updatedDetails);
    } catch (error) {
      console.error("Error updating vendor payment details:", error);
      res.status(400).json({ message: "Failed to update vendor payment details" });
    }
  });

  app.delete('/api/vendor-payment-details/:id/:organizationId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const detailsId = parseInt(req.params.id);
      const organizationId = parseInt(req.params.organizationId);

      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }
      
      if (!hasPermission(userRole.role, userRole.permissions, 'edit_transactions')) {
        return res.status(403).json({ message: "You don't have permission to manage vendor payment details" });
      }

      await storage.deleteVendorPaymentDetails(detailsId);
      res.json({ message: "Vendor payment details deleted successfully" });
    } catch (error) {
      console.error("Error deleting vendor payment details:", error);
      res.status(500).json({ message: "Failed to delete vendor payment details" });
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

  // Repair audit log chain (NIST 800-53 AU-10 - fix chain integrity issues)
  app.post('/api/security/audit-chain/repair/:organizationId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);
      
      // Check user has access to this organization and is admin/owner
      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }
      
      // Only admin and owner can repair audit chain
      if (userRole.role !== 'admin' && userRole.role !== 'owner') {
        return res.status(403).json({ message: "You don't have permission to repair audit chain" });
      }
      
      console.log(`[Audit Chain Repair] Starting repair for org ${organizationId}...`);
      const result = await storage.repairAuditLogChain(organizationId);
      console.log(`[Audit Chain Repair] Completed: ${result.repaired} entries repaired`);
      
      // Log the repair action itself
      await storage.logAuditTrail({
        organizationId,
        userId,
        entityType: 'audit_chain',
        entityId: organizationId.toString(),
        action: 'update',
        newValues: { 
          repaired: result.repaired, 
          nullHashesFixed: result.nullHashesFixed,
          brokenLinksFixed: result.brokenLinksFixed,
          action: 'chain_repair' 
        },
      });
      
      res.json(result);
    } catch (error: any) {
      console.error("[Audit Chain Repair] Error:", error?.message || error);
      res.status(500).json({ message: "Failed to repair audit chain", error: error?.message });
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
  // Use isAuthenticatedAllowPendingMfa to allow users in MFA setup flow to access this
  app.get('/api/security/mfa/status', isAuthenticatedAllowPendingMfa, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const gracePeriodCheck = await storage.checkMfaGracePeriod(userId);
      const backupCodes = await storage.getMfaBackupCodes(userId);
      
      res.json({
        mfaEnabled: user.mfaEnabled,
        mfaRequired: user.mfaRequired,
        mfaGracePeriodEnd: user.mfaGracePeriodEnd,
        mfaVerifiedAt: user.mfaVerifiedAt,
        gracePeriodExpired: gracePeriodCheck.expired,
        daysRemaining: gracePeriodCheck.daysRemaining,
        backupCodesRemaining: backupCodes?.length || 0,
      });
    } catch (error) {
      console.error("Error fetching MFA status:", error);
      res.status(500).json({ message: "Failed to fetch MFA status" });
    }
  });

  app.post('/api/security/mfa/set-required', isAuthenticated, requireMfaCompliance, async (req: any, res) => {
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

  // MFA TOTP implementation endpoints (NIST 800-53 IA-2(1))
  
  // Begin MFA setup - generates secret and QR code
  // Use isAuthenticatedAllowPendingMfa to allow users in MFA setup flow to access this
  app.post('/api/security/mfa/setup', isAuthenticatedAllowPendingMfa, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (user.mfaEnabled) {
        return res.status(400).json({ message: "MFA is already enabled. Disable it first to set up again." });
      }
      
      const { generateTotpSecret, createTotpUri, generateQrCodeDataUrl } = await import('./mfa');
      const { encryptField } = await import('./encryption');
      
      const secret = generateTotpSecret();
      const uri = createTotpUri(secret, user.email || userId);
      const qrCode = await generateQrCodeDataUrl(uri);
      
      const encryptedSecret = encryptField(secret);
      await storage.setupMfaSecret(userId, encryptedSecret);
      
      res.json({
        secret,
        qrCode,
        message: "Scan the QR code with your authenticator app, then verify with a code",
      });
    } catch (error) {
      console.error("Error setting up MFA:", error);
      res.status(500).json({ message: "Failed to set up MFA" });
    }
  });
  
  // Verify MFA code and complete setup
  // Use isAuthenticatedAllowPendingMfa to allow users in MFA setup flow to access this
  app.post('/api/security/mfa/verify-setup', isAuthenticatedAllowPendingMfa, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { code } = req.body;
      
      if (!code || typeof code !== 'string') {
        return res.status(400).json({ message: "Verification code is required" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (user.mfaEnabled) {
        return res.status(400).json({ message: "MFA is already enabled" });
      }
      
      const encryptedSecret = await storage.getMfaSecret(userId);
      if (!encryptedSecret) {
        return res.status(400).json({ message: "MFA setup not initiated. Please start setup first." });
      }
      
      const { verifyTotp, generateBackupCodes, hashBackupCode } = await import('./mfa');
      const { decryptField } = await import('./encryption');
      
      const secret = decryptField(encryptedSecret);
      const isValid = verifyTotp(secret, code);
      
      if (!isValid) {
        await storage.logSecurityEvent({
          eventType: 'login_failure',
          severity: 'warning',
          userId,
          email: user.email,
          ipAddress: req.ip || req.socket.remoteAddress || null,
          userAgent: req.get('user-agent') || null,
          eventData: {
            action: 'mfa_setup_verification_failed',
          },
        });
        return res.status(400).json({ message: "Invalid verification code. Please try again." });
      }
      
      const backupCodes = generateBackupCodes();
      const hashedBackupCodes = backupCodes.map(hashBackupCode);
      
      await storage.enableMfa(userId, hashedBackupCodes);
      
      // Clear MFA pending state - user has now completed MFA setup
      (req.session as any).mfaPending = false;
      (req.session as any).mfaVerified = true;
      (req.session as any).mfaSetupRequired = false;
      
      await storage.logSecurityEvent({
        eventType: 'login_success',
        severity: 'info',
        userId,
        email: user.email,
        ipAddress: req.ip || req.socket.remoteAddress || null,
        userAgent: req.get('user-agent') || null,
        eventData: {
          action: 'mfa_enabled',
        },
      });
      
      res.json({
        success: true,
        backupCodes,
        message: "MFA has been enabled. Save your backup codes in a secure location.",
      });
    } catch (error) {
      console.error("Error verifying MFA setup:", error);
      res.status(500).json({ message: "Failed to verify MFA setup" });
    }
  });
  
  // Verify MFA code during login
  app.post('/api/security/mfa/verify', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { code, isBackupCode } = req.body;
      
      if (!code || typeof code !== 'string') {
        return res.status(400).json({ message: "Verification code is required" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (!user.mfaEnabled) {
        return res.status(400).json({ message: "MFA is not enabled for this account" });
      }
      
      const encryptedSecret = await storage.getMfaSecret(userId);
      if (!encryptedSecret) {
        return res.status(400).json({ message: "MFA configuration error" });
      }
      
      if (isBackupCode) {
        const { verifyBackupCode } = await import('./mfa');
        const backupCodes = await storage.getMfaBackupCodes(userId);
        
        if (!backupCodes || backupCodes.length === 0) {
          return res.status(400).json({ message: "No backup codes available" });
        }
        
        const { valid, remainingCodes } = verifyBackupCode(code, backupCodes);
        
        if (!valid) {
          await storage.logSecurityEvent({
            eventType: 'login_failure',
            severity: 'warning',
            userId,
            email: user.email,
            ipAddress: req.ip || req.socket.remoteAddress || null,
            userAgent: req.get('user-agent') || null,
            eventData: {
              action: 'mfa_backup_code_failed',
            },
          });
          return res.status(400).json({ message: "Invalid backup code" });
        }
        
        await storage.updateMfaBackupCodes(userId, remainingCodes);
        
        await storage.logSecurityEvent({
          eventType: 'login_success',
          severity: 'info',
          userId,
          email: user.email,
          ipAddress: req.ip || req.socket.remoteAddress || null,
          userAgent: req.get('user-agent') || null,
          eventData: {
            action: 'mfa_backup_code_used',
            remainingBackupCodes: remainingCodes.length,
          },
        });
        
        res.json({
          success: true,
          remainingBackupCodes: remainingCodes.length,
          message: "Backup code verified successfully",
        });
      } else {
        const { verifyTotp } = await import('./mfa');
        const { decryptField } = await import('./encryption');
        
        const secret = decryptField(encryptedSecret);
        const isValid = verifyTotp(secret, code);
        
        if (!isValid) {
          await storage.logSecurityEvent({
            eventType: 'login_failure',
            severity: 'warning',
            userId,
            email: user.email,
            ipAddress: req.ip || req.socket.remoteAddress || null,
            userAgent: req.get('user-agent') || null,
            eventData: {
              action: 'mfa_verification_failed',
            },
          });
          return res.status(400).json({ message: "Invalid verification code" });
        }
        
        await storage.logSecurityEvent({
          eventType: 'login_success',
          severity: 'info',
          userId,
          email: user.email,
          ipAddress: req.ip || req.socket.remoteAddress || null,
          userAgent: req.get('user-agent') || null,
          eventData: {
            action: 'mfa_verified',
          },
        });
        
        res.json({
          success: true,
          message: "MFA verification successful",
        });
      }
    } catch (error) {
      console.error("Error verifying MFA:", error);
      res.status(500).json({ message: "Failed to verify MFA" });
    }
  });
  
  // Verify MFA code during login (for pending MFA sessions)
  app.post('/api/auth/mfa/verify-login', isAuthenticatedAllowPendingMfa, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { code, isBackupCode } = req.body;
      
      if (!code || typeof code !== 'string') {
        return res.status(400).json({ message: "Verification code is required" });
      }
      
      // Check if MFA is actually pending
      if (!(req.session as any).mfaPending) {
        return res.status(400).json({ message: "No MFA verification pending" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (!user.mfaEnabled) {
        // MFA was disabled while session was pending - clear the pending flag
        (req.session as any).mfaPending = false;
        (req.session as any).mfaVerified = true;
        await new Promise<void>((resolve, reject) => {
          req.session.save((err: any) => err ? reject(err) : resolve());
        });
        return res.json({ success: true, message: "MFA not required" });
      }
      
      const encryptedSecret = await storage.getMfaSecret(userId);
      if (!encryptedSecret) {
        return res.status(400).json({ message: "MFA configuration error" });
      }
      
      if (isBackupCode) {
        const { verifyBackupCode } = await import('./mfa');
        const backupCodes = await storage.getMfaBackupCodes(userId);
        
        if (!backupCodes || backupCodes.length === 0) {
          return res.status(400).json({ message: "No backup codes available" });
        }
        
        const { valid, remainingCodes } = verifyBackupCode(code, backupCodes);
        
        if (!valid) {
          await storage.logSecurityEvent({
            eventType: 'login_failure',
            severity: 'warning',
            userId,
            email: user.email,
            ipAddress: req.ip || req.socket.remoteAddress || null,
            userAgent: req.get('user-agent') || null,
            eventData: {
              action: 'mfa_login_backup_code_failed',
            },
          });
          return res.status(400).json({ message: "Invalid backup code" });
        }
        
        await storage.updateMfaBackupCodes(userId, remainingCodes);
        
        // Mark MFA as verified in session and save
        (req.session as any).mfaPending = false;
        (req.session as any).mfaVerified = true;
        await new Promise<void>((resolve, reject) => {
          req.session.save((err: any) => err ? reject(err) : resolve());
        });
        
        await storage.logSecurityEvent({
          eventType: 'login_success',
          severity: 'info',
          userId,
          email: user.email,
          ipAddress: req.ip || req.socket.remoteAddress || null,
          userAgent: req.get('user-agent') || null,
          eventData: {
            action: 'mfa_login_backup_code_verified',
            remainingBackupCodes: remainingCodes.length,
          },
        });
        
        res.json({
          success: true,
          remainingBackupCodes: remainingCodes.length,
          message: "Login verified with backup code",
        });
      } else {
        const { verifyTotp } = await import('./mfa');
        const { decryptField } = await import('./encryption');
        
        const secret = decryptField(encryptedSecret);
        const isValid = verifyTotp(secret, code);
        
        if (!isValid) {
          await storage.logSecurityEvent({
            eventType: 'login_failure',
            severity: 'warning',
            userId,
            email: user.email,
            ipAddress: req.ip || req.socket.remoteAddress || null,
            userAgent: req.get('user-agent') || null,
            eventData: {
              action: 'mfa_login_verification_failed',
            },
          });
          return res.status(400).json({ message: "Invalid verification code" });
        }
        
        // Mark MFA as verified in session and save
        (req.session as any).mfaPending = false;
        (req.session as any).mfaVerified = true;
        await new Promise<void>((resolve, reject) => {
          req.session.save((err: any) => err ? reject(err) : resolve());
        });
        
        await storage.logSecurityEvent({
          eventType: 'login_success',
          severity: 'info',
          userId,
          email: user.email,
          ipAddress: req.ip || req.socket.remoteAddress || null,
          userAgent: req.get('user-agent') || null,
          eventData: {
            action: 'mfa_login_verified',
          },
        });
        
        res.json({
          success: true,
          message: "Login MFA verification successful",
        });
      }
    } catch (error) {
      console.error("Error verifying login MFA:", error);
      res.status(500).json({ message: "Failed to verify MFA" });
    }
  });
  
  // Check MFA login pending status
  app.get('/api/auth/mfa/login-status', isAuthenticatedAllowPendingMfa, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const mfaPending = (req.session as any).mfaPending === true;
      const mfaVerified = (req.session as any).mfaVerified === true;
      
      const user = await storage.getUser(userId);
      const backupCodesRemaining = user?.mfaBackupCodes?.length || 0;
      
      res.json({
        mfaPending,
        mfaVerified,
        backupCodesRemaining,
        userId,
      });
    } catch (error) {
      console.error("Error checking MFA login status:", error);
      res.status(500).json({ message: "Failed to check MFA status" });
    }
  });
  
  // Disable MFA (requires current MFA code)
  app.post('/api/security/mfa/disable', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { code } = req.body;
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (!user.mfaEnabled) {
        return res.status(400).json({ message: "MFA is not enabled" });
      }
      
      const encryptedSecret = await storage.getMfaSecret(userId);
      if (!encryptedSecret) {
        return res.status(400).json({ message: "MFA configuration error" });
      }
      
      const { verifyTotp } = await import('./mfa');
      const { decryptField } = await import('./encryption');
      
      const secret = decryptField(encryptedSecret);
      const isValid = verifyTotp(secret, code);
      
      if (!isValid) {
        return res.status(400).json({ message: "Invalid verification code" });
      }
      
      await storage.disableMfa(userId);
      
      await storage.logSecurityEvent({
        eventType: 'login_success',
        severity: 'warning',
        userId,
        email: user.email,
        ipAddress: req.ip || req.socket.remoteAddress || null,
        userAgent: req.get('user-agent') || null,
        eventData: {
          action: 'mfa_disabled',
        },
      });
      
      res.json({
        success: true,
        message: "MFA has been disabled",
      });
    } catch (error) {
      console.error("Error disabling MFA:", error);
      res.status(500).json({ message: "Failed to disable MFA" });
    }
  });
  
  // Regenerate backup codes
  app.post('/api/security/mfa/regenerate-backup-codes', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { code } = req.body;
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (!user.mfaEnabled) {
        return res.status(400).json({ message: "MFA is not enabled" });
      }
      
      const encryptedSecret = await storage.getMfaSecret(userId);
      if (!encryptedSecret) {
        return res.status(400).json({ message: "MFA configuration error" });
      }
      
      const { verifyTotp, generateBackupCodes, hashBackupCode } = await import('./mfa');
      const { decryptField } = await import('./encryption');
      
      const secret = decryptField(encryptedSecret);
      const isValid = verifyTotp(secret, code);
      
      if (!isValid) {
        return res.status(400).json({ message: "Invalid verification code" });
      }
      
      const backupCodes = generateBackupCodes();
      const hashedBackupCodes = backupCodes.map(hashBackupCode);
      
      await storage.updateMfaBackupCodes(userId, hashedBackupCodes);
      
      await storage.logSecurityEvent({
        eventType: 'login_success',
        severity: 'info',
        userId,
        email: user.email,
        ipAddress: req.ip || req.socket.remoteAddress || null,
        userAgent: req.get('user-agent') || null,
        eventData: {
          action: 'mfa_backup_codes_regenerated',
        },
      });
      
      res.json({
        success: true,
        backupCodes,
        message: "Backup codes have been regenerated. Save them in a secure location.",
      });
    } catch (error) {
      console.error("Error regenerating backup codes:", error);
      res.status(500).json({ message: "Failed to regenerate backup codes" });
    }
  });

  // NIST 800-53 AU-11: Audit Log Retention API
  // Manual trigger for audit retention policies (admin only)
  app.post('/api/security/audit-retention/run', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      // Only allow system admins (users with owner role in any org) to run retention
      const userOrgs = await storage.getOrganizationsByUser(userId);
      const isOwner = userOrgs.some((org: any) => org.userRole === 'owner');
      
      if (!isOwner) {
        return res.status(403).json({ message: "Only organization owners can run audit retention" });
      }

      const { runAuditRetentionPolicies } = await import('./auditRetention');
      const result = await runAuditRetentionPolicies();

      // Log the manual trigger
      await storage.createAuditLog({
        userId,
        action: 'audit_retention_manual_trigger',
        resourceType: 'system',
        resourceId: null,
        details: result,
        ipAddress: req.ip || req.socket.remoteAddress || null,
        userAgent: req.get('user-agent') || null,
        eventData: {
          archived: result.archived,
          deleted: result.deleted,
          stats: result.stats,
        },
      });

      res.json({
        success: true,
        archived: result.archived,
        deleted: result.deleted,
        stats: result.stats,
      });
    } catch (error) {
      console.error("Error running audit retention:", error);
      res.status(500).json({ message: "Failed to run audit retention" });
    }
  });

  // Get audit retention statistics
  app.get('/api/security/audit-retention/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Only allow organization owners to view retention stats
      const userOrgs = await storage.getOrganizationsByUser(userId);
      const isOwner = userOrgs.some((org: any) => org.userRole === 'owner');
      
      if (!isOwner) {
        return res.status(403).json({ message: "Only organization owners can view audit retention stats" });
      }

      const { getAuditRetentionStats } = await import('./auditRetention');
      const stats = await getAuditRetentionStats();

      res.json(stats);
    } catch (error) {
      console.error("Error getting audit retention stats:", error);
      res.status(500).json({ message: "Failed to get audit retention stats" });
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

  // Fund accounting summary - calculates restricted/unrestricted totals from transactions based on category fundType
  app.get("/api/fund-accounting/:organizationId", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);

      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "You don't have access to this organization" });
      }

      const summary = await storage.getFundAccountingSummary(organizationId);
      res.json(summary);
    } catch (error) {
      console.error("Error fetching fund accounting summary:", error);
      res.status(500).json({ message: "Failed to fetch fund accounting summary" });
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

  // Program Budget vs Actual report
  app.get("/api/programs/budget-vs-actual/:organizationId", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);
      const { startDate, endDate } = req.query;

      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Require make_reports permission for budget vs actual analysis
      if (!hasPermission(userRole.role, userRole.permissions, 'make_reports')) {
        return res.status(403).json({ message: "You don't have permission to view reports" });
      }

      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;

      const report = await storage.getProgramBudgetVsActual(organizationId, start, end);
      res.json(report);
    } catch (error) {
      console.error("Error fetching program budget vs actual:", error);
      res.status(500).json({ message: "Failed to fetch budget vs actual report" });
    }
  });

  // ============================================
  // MILEAGE TRACKING ROUTES
  // ============================================

  // Mileage rates
  app.get("/api/mileage-rates/:organizationId", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);

      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied" });
      }

      const rates = await storage.getMileageRates(organizationId);
      res.json(rates);
    } catch (error) {
      console.error("Error fetching mileage rates:", error);
      res.status(500).json({ message: "Failed to fetch mileage rates" });
    }
  });

  app.post("/api/mileage-rates", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const { organizationId, ...rateData } = req.body;

      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole || !hasPermission(userRole.role, userRole.permissions, 'edit_transactions')) {
        return res.status(403).json({ message: "Access denied" });
      }

      const rate = await storage.createMileageRate({ organizationId, ...rateData });
      res.status(201).json(rate);
    } catch (error) {
      console.error("Error creating mileage rate:", error);
      res.status(500).json({ message: "Failed to create mileage rate" });
    }
  });

  app.put("/api/mileage-rates/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const rateId = parseInt(req.params.id);
      const updates = req.body;

      const rate = await storage.getMileageRate(rateId);
      if (!rate) {
        return res.status(404).json({ message: "Mileage rate not found" });
      }

      const userRole = await storage.getUserRole(userId, rate.organizationId);
      if (!userRole || !hasPermission(userRole.role, userRole.permissions, 'edit_transactions')) {
        return res.status(403).json({ message: "Access denied" });
      }

      const updated = await storage.updateMileageRate(rateId, updates);
      res.json(updated);
    } catch (error) {
      console.error("Error updating mileage rate:", error);
      res.status(500).json({ message: "Failed to update mileage rate" });
    }
  });

  app.delete("/api/mileage-rates/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const rateId = parseInt(req.params.id);

      const rate = await storage.getMileageRate(rateId);
      if (!rate) {
        return res.status(404).json({ message: "Mileage rate not found" });
      }

      const userRole = await storage.getUserRole(userId, rate.organizationId);
      if (!userRole || !hasPermission(userRole.role, userRole.permissions, 'edit_transactions')) {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.deleteMileageRate(rateId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting mileage rate:", error);
      res.status(500).json({ message: "Failed to delete mileage rate" });
    }
  });

  // Mileage expenses
  app.get("/api/mileage-expenses/:organizationId", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);
      const { status, startDate, endDate, userFilter } = req.query;

      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied" });
      }

      const filters: any = {};
      if (status) filters.status = status;
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);
      // Viewers can only see their own expenses
      if (userRole.role === 'viewer') {
        filters.userId = userId;
      } else if (userFilter) {
        filters.userId = userFilter;
      }

      const expenses = await storage.getMileageExpenses(organizationId, filters);
      res.json(expenses);
    } catch (error) {
      console.error("Error fetching mileage expenses:", error);
      res.status(500).json({ message: "Failed to fetch mileage expenses" });
    }
  });

  app.post("/api/mileage-expenses", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const { organizationId, ...expenseData } = req.body;

      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied" });
      }

      const expense = await storage.createMileageExpense({
        organizationId,
        userId,
        ...expenseData,
      });
      res.status(201).json(expense);
    } catch (error) {
      console.error("Error creating mileage expense:", error);
      res.status(500).json({ message: "Failed to create mileage expense" });
    }
  });

  app.put("/api/mileage-expenses/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const expenseId = parseInt(req.params.id);
      const updates = req.body;

      const expense = await storage.getMileageExpense(expenseId);
      if (!expense) {
        return res.status(404).json({ message: "Mileage expense not found" });
      }

      const userRole = await storage.getUserRole(userId, expense.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Only allow editing own pending expenses or admin can edit any
      if (expense.userId !== userId && userRole.role !== 'owner' && userRole.role !== 'admin') {
        return res.status(403).json({ message: "Can only edit your own expenses" });
      }

      if (expense.status !== 'pending' && userRole.role !== 'owner' && userRole.role !== 'admin') {
        return res.status(400).json({ message: "Can only edit pending expenses" });
      }

      const updated = await storage.updateMileageExpense(expenseId, updates);
      res.json(updated);
    } catch (error) {
      console.error("Error updating mileage expense:", error);
      res.status(500).json({ message: "Failed to update mileage expense" });
    }
  });

  app.delete("/api/mileage-expenses/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const expenseId = parseInt(req.params.id);

      const expense = await storage.getMileageExpense(expenseId);
      if (!expense) {
        return res.status(404).json({ message: "Mileage expense not found" });
      }

      const userRole = await storage.getUserRole(userId, expense.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Only owner/admin can delete, or user can delete own pending
      if (expense.userId !== userId && userRole.role !== 'owner' && userRole.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      if (expense.status !== 'pending' && userRole.role !== 'owner' && userRole.role !== 'admin') {
        return res.status(400).json({ message: "Can only delete pending expenses" });
      }

      await storage.deleteMileageExpense(expenseId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting mileage expense:", error);
      res.status(500).json({ message: "Failed to delete mileage expense" });
    }
  });

  app.post("/api/mileage-expenses/:id/approve", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const expenseId = parseInt(req.params.id);

      const expense = await storage.getMileageExpense(expenseId);
      if (!expense) {
        return res.status(404).json({ message: "Mileage expense not found" });
      }

      const userRole = await storage.getUserRole(userId, expense.organizationId);
      if (!userRole || !hasPermission(userRole.role, userRole.permissions, 'edit_transactions')) {
        return res.status(403).json({ message: "Access denied" });
      }

      const approved = await storage.approveMileageExpense(expenseId, userId);
      res.json(approved);
    } catch (error) {
      console.error("Error approving mileage expense:", error);
      res.status(500).json({ message: "Failed to approve mileage expense" });
    }
  });

  app.post("/api/mileage-expenses/:id/reject", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const expenseId = parseInt(req.params.id);
      const { notes } = req.body;

      const expense = await storage.getMileageExpense(expenseId);
      if (!expense) {
        return res.status(404).json({ message: "Mileage expense not found" });
      }

      const userRole = await storage.getUserRole(userId, expense.organizationId);
      if (!userRole || !hasPermission(userRole.role, userRole.permissions, 'edit_transactions')) {
        return res.status(403).json({ message: "Access denied" });
      }

      const rejected = await storage.rejectMileageExpense(expenseId, userId, notes);
      res.json(rejected);
    } catch (error) {
      console.error("Error rejecting mileage expense:", error);
      res.status(500).json({ message: "Failed to reject mileage expense" });
    }
  });

  // ============================================
  // PER DIEM ROUTES
  // ============================================

  // Per diem rates
  app.get("/api/per-diem-rates/:organizationId", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);

      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied" });
      }

      const rates = await storage.getPerDiemRates(organizationId);
      res.json(rates);
    } catch (error) {
      console.error("Error fetching per diem rates:", error);
      res.status(500).json({ message: "Failed to fetch per diem rates" });
    }
  });

  app.post("/api/per-diem-rates", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const { organizationId, ...rateData } = req.body;

      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole || !hasPermission(userRole.role, userRole.permissions, 'edit_transactions')) {
        return res.status(403).json({ message: "Access denied" });
      }

      const rate = await storage.createPerDiemRate({ organizationId, ...rateData });
      res.status(201).json(rate);
    } catch (error) {
      console.error("Error creating per diem rate:", error);
      res.status(500).json({ message: "Failed to create per diem rate" });
    }
  });

  app.put("/api/per-diem-rates/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const rateId = parseInt(req.params.id);
      const updates = req.body;

      const rate = await storage.getPerDiemRate(rateId);
      if (!rate) {
        return res.status(404).json({ message: "Per diem rate not found" });
      }

      const userRole = await storage.getUserRole(userId, rate.organizationId);
      if (!userRole || !hasPermission(userRole.role, userRole.permissions, 'edit_transactions')) {
        return res.status(403).json({ message: "Access denied" });
      }

      const updated = await storage.updatePerDiemRate(rateId, updates);
      res.json(updated);
    } catch (error) {
      console.error("Error updating per diem rate:", error);
      res.status(500).json({ message: "Failed to update per diem rate" });
    }
  });

  app.delete("/api/per-diem-rates/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const rateId = parseInt(req.params.id);

      const rate = await storage.getPerDiemRate(rateId);
      if (!rate) {
        return res.status(404).json({ message: "Per diem rate not found" });
      }

      const userRole = await storage.getUserRole(userId, rate.organizationId);
      if (!userRole || !hasPermission(userRole.role, userRole.permissions, 'edit_transactions')) {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.deletePerDiemRate(rateId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting per diem rate:", error);
      res.status(500).json({ message: "Failed to delete per diem rate" });
    }
  });

  // Per diem expenses
  app.get("/api/per-diem-expenses/:organizationId", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);
      const { status, startDate, endDate, userFilter } = req.query;

      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied" });
      }

      const filters: any = {};
      if (status) filters.status = status;
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);
      // Viewers can only see their own expenses
      if (userRole.role === 'viewer') {
        filters.userId = userId;
      } else if (userFilter) {
        filters.userId = userFilter;
      }

      const expenses = await storage.getPerDiemExpenses(organizationId, filters);
      res.json(expenses);
    } catch (error) {
      console.error("Error fetching per diem expenses:", error);
      res.status(500).json({ message: "Failed to fetch per diem expenses" });
    }
  });

  app.post("/api/per-diem-expenses", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const { organizationId, ...expenseData } = req.body;

      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied" });
      }

      const expense = await storage.createPerDiemExpense({
        organizationId,
        userId,
        ...expenseData,
      });
      res.status(201).json(expense);
    } catch (error) {
      console.error("Error creating per diem expense:", error);
      res.status(500).json({ message: "Failed to create per diem expense" });
    }
  });

  app.put("/api/per-diem-expenses/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const expenseId = parseInt(req.params.id);
      const updates = req.body;

      const expense = await storage.getPerDiemExpense(expenseId);
      if (!expense) {
        return res.status(404).json({ message: "Per diem expense not found" });
      }

      const userRole = await storage.getUserRole(userId, expense.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied" });
      }

      if (expense.userId !== userId && userRole.role !== 'owner' && userRole.role !== 'admin') {
        return res.status(403).json({ message: "Can only edit your own expenses" });
      }

      if (expense.status !== 'pending' && userRole.role !== 'owner' && userRole.role !== 'admin') {
        return res.status(400).json({ message: "Can only edit pending expenses" });
      }

      const updated = await storage.updatePerDiemExpense(expenseId, updates);
      res.json(updated);
    } catch (error) {
      console.error("Error updating per diem expense:", error);
      res.status(500).json({ message: "Failed to update per diem expense" });
    }
  });

  app.delete("/api/per-diem-expenses/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const expenseId = parseInt(req.params.id);

      const expense = await storage.getPerDiemExpense(expenseId);
      if (!expense) {
        return res.status(404).json({ message: "Per diem expense not found" });
      }

      const userRole = await storage.getUserRole(userId, expense.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied" });
      }

      if (expense.userId !== userId && userRole.role !== 'owner' && userRole.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      if (expense.status !== 'pending' && userRole.role !== 'owner' && userRole.role !== 'admin') {
        return res.status(400).json({ message: "Can only delete pending expenses" });
      }

      await storage.deletePerDiemExpense(expenseId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting per diem expense:", error);
      res.status(500).json({ message: "Failed to delete per diem expense" });
    }
  });

  app.post("/api/per-diem-expenses/:id/approve", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const expenseId = parseInt(req.params.id);

      const expense = await storage.getPerDiemExpense(expenseId);
      if (!expense) {
        return res.status(404).json({ message: "Per diem expense not found" });
      }

      const userRole = await storage.getUserRole(userId, expense.organizationId);
      if (!userRole || !hasPermission(userRole.role, userRole.permissions, 'edit_transactions')) {
        return res.status(403).json({ message: "Access denied" });
      }

      const approved = await storage.approvePerDiemExpense(expenseId, userId);
      res.json(approved);
    } catch (error) {
      console.error("Error approving per diem expense:", error);
      res.status(500).json({ message: "Failed to approve per diem expense" });
    }
  });

  app.post("/api/per-diem-expenses/:id/reject", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const expenseId = parseInt(req.params.id);
      const { notes } = req.body;

      const expense = await storage.getPerDiemExpense(expenseId);
      if (!expense) {
        return res.status(404).json({ message: "Per diem expense not found" });
      }

      const userRole = await storage.getUserRole(userId, expense.organizationId);
      if (!userRole || !hasPermission(userRole.role, userRole.permissions, 'edit_transactions')) {
        return res.status(403).json({ message: "Access denied" });
      }

      const rejected = await storage.rejectPerDiemExpense(expenseId, userId, notes);
      res.json(rejected);
    } catch (error) {
      console.error("Error rejecting per diem expense:", error);
      res.status(500).json({ message: "Failed to reject per diem expense" });
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

  // Form 990 AI Narrative Builder
  app.post("/api/form-990/generate-narrative", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const { organizationId, narrativeType, taxYear, customContext } = req.body;

      if (!organizationId) {
        return res.status(400).json({ message: "Organization ID is required" });
      }

      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "You don't have access to this organization" });
      }

      // Get organization details for context
      const organization = await storage.getOrganization(organizationId);
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }

      // Check if AI is available
      const isReplitEnvironment = !!process.env.AI_INTEGRATIONS_OPENAI_BASE_URL && !!process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
      const hasOpenAIKey = !!process.env.OPENAI_API_KEY;

      if (!isReplitEnvironment && !hasOpenAIKey) {
        return res.status(503).json({ 
          message: "AI features are not available. Please configure OpenAI API key." 
        });
      }

      const OpenAI = (await import("openai")).default;
      const openai = isReplitEnvironment 
        ? new OpenAI({
            baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
            apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
          })
        : new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
          });

      // Get financial data for context
      const form990Data = await storage.getForm990Data(organizationId, taxYear || new Date().getFullYear() - 1);
      const programs = await storage.getPrograms(organizationId);
      
      // Build narrative type specific prompts
      let systemPrompt = "";
      let userPrompt = "";

      // Safe access to form990Data with defaults
      const revenue = form990Data?.totalRevenue || "0";
      const expenses = form990Data?.totalExpenses || "0";
      const programExpenses = form990Data?.programServiceExpenses || "0";
      const programList = programs && programs.length > 0 ? programs.map(p => p.name).join(", ") : "";

      const orgContext = `
Organization: ${organization.name}
Type: ${organization.organizationType || "nonprofit"}
Tax Year: ${taxYear || new Date().getFullYear() - 1}
Total Revenue: $${revenue}
Total Expenses: $${expenses}
Program Expenses: $${programExpenses}
${programList ? `Programs: ${programList}` : ""}
${customContext ? `Additional Context: ${customContext}` : ""}
`;

      switch (narrativeType) {
        case "mission":
          systemPrompt = `You are an expert nonprofit compliance writer specializing in IRS Form 990 preparation. 
Write clear, concise mission statements that describe the organization's exempt purpose and primary activities.
The statement should be suitable for Part I, Lines 1-2 of Form 990.
Keep the response to 2-3 sentences that clearly explain what the organization does and who it serves.`;
          userPrompt = `Based on the following organization details, write a compelling mission statement for Form 990:
${orgContext}

Write a mission statement that:
1. Describes the organization's exempt purpose
2. Identifies the primary activities
3. Notes who benefits from these activities
4. Uses clear, professional language appropriate for IRS filing`;
          break;

        case "accomplishments":
          systemPrompt = `You are an expert nonprofit compliance writer specializing in IRS Form 990 preparation.
Write detailed program accomplishments for Part III of Form 990.
Include specific, measurable outcomes where possible.
Each program description should explain: what was done, who was served, and what was achieved.`;
          userPrompt = `Based on the following organization details, write program service accomplishments for Form 990 Part III:
${orgContext}

Write accomplishment descriptions that:
1. Describe 2-3 major programs based on the context provided
2. Include estimated numbers of people or communities served
3. Mention measurable outcomes or impacts
4. Are written in past tense for the tax year
5. Total approximately 200-300 words`;
          break;

        case "governance":
          systemPrompt = `You are an expert nonprofit compliance writer specializing in IRS Form 990 governance questions.
Write descriptions of governance policies and practices for Part VI of Form 990.
Focus on board oversight, conflict of interest policies, and organizational accountability.`;
          userPrompt = `Based on the following organization details, write governance policy descriptions for Form 990 Part VI:
${orgContext}

Write governance descriptions covering:
1. Board meeting frequency and oversight practices
2. Conflict of interest policy and procedures
3. Document retention and destruction policies
4. Whistleblower policy
5. How the governing body reviews Form 990 before filing
Keep the response professional and factual, approximately 150-200 words.`;
          break;

        case "compensation":
          systemPrompt = `You are an expert nonprofit compliance writer specializing in IRS Form 990 compensation disclosure.
Write descriptions of compensation review processes for Part VI, Lines 15a-b.
Focus on independent review, comparability data, and contemporaneous documentation.`;
          userPrompt = `Based on the following organization details, write compensation review process descriptions for Form 990 Part VI:
${orgContext}

Describe the compensation review process including:
1. Who reviews and approves executive compensation
2. Whether independent review or compensation committee is used
3. Use of comparability data from similar organizations
4. How determinations are documented
5. Process for reviewing key employee compensation
Keep the response approximately 100-150 words.`;
          break;

        default:
          return res.status(400).json({ message: "Invalid narrative type" });
      }

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      });

      const narrative = completion.choices[0]?.message?.content || "";

      // Log the AI generation for audit purposes
      await storage.createAuditLog({
        organizationId,
        userId,
        action: "ai_narrative_generated",
        resourceType: "form990",
        resourceId: narrativeType,
        oldValue: null,
        newValue: JSON.stringify({ narrativeType, taxYear }),
        ipAddress: req.ip || null,
        userAgent: req.headers["user-agent"] || null,
      });

      res.json({ narrative, narrativeType });
    } catch (error: any) {
      console.error("Error generating Form 990 narrative:", error);
      res.status(500).json({ message: error.message || "Failed to generate narrative" });
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

  // ============================================
  // STRIPE PAYMENT ROUTES
  // Reference: connection:conn_stripe_01KBR6VNRM1YXQ0MFRV5N4NKP1
  // ============================================

  // Get Stripe publishable key for frontend
  app.get('/api/stripe/publishable-key', async (req, res) => {
    try {
      const publishableKey = await getStripePublishableKey();
      res.json({ publishableKey });
    } catch (error: any) {
      console.error('Error getting Stripe publishable key:', error);
      res.status(500).json({ message: 'Failed to get Stripe configuration' });
    }
  });

  // List products from Stripe API
  app.get('/api/stripe/products', async (req, res) => {
    try {
      const { getUncachableStripeClient } = await import('./stripeClient');
      const stripe = await getUncachableStripeClient();
      const products = await stripe.products.list({ active: true, limit: 100 });
      res.json({ data: products.data });
    } catch (error: any) {
      console.error('Error fetching Stripe products:', error);
      res.status(500).json({ message: 'Failed to fetch products' });
    }
  });

  // List products with prices from Stripe API
  app.get('/api/stripe/products-with-prices', async (req, res) => {
    try {
      const { getUncachableStripeClient } = await import('./stripeClient');
      const stripe = await getUncachableStripeClient();
      
      const products = await stripe.products.list({ active: true, limit: 100 });
      const prices = await stripe.prices.list({ active: true, limit: 100 });
      
      // Group prices by product
      const pricesByProduct = new Map<string, any[]>();
      for (const price of prices.data) {
        const productId = typeof price.product === 'string' ? price.product : price.product.id;
        if (!pricesByProduct.has(productId)) {
          pricesByProduct.set(productId, []);
        }
        pricesByProduct.get(productId)!.push({
          id: price.id,
          unit_amount: price.unit_amount,
          currency: price.currency,
          recurring: price.recurring,
          active: price.active,
          metadata: price.metadata,
        });
      }

      const productsWithPrices = products.data.map(product => ({
        id: product.id,
        name: product.name,
        description: product.description,
        active: product.active,
        metadata: product.metadata,
        prices: pricesByProduct.get(product.id) || []
      }));

      res.json({ data: productsWithPrices });
    } catch (error: any) {
      console.error('Error fetching Stripe products with prices:', error);
      res.status(500).json({ message: 'Failed to fetch products' });
    }
  });

  // List prices from Stripe API
  app.get('/api/stripe/prices', async (req, res) => {
    try {
      const { getUncachableStripeClient } = await import('./stripeClient');
      const stripe = await getUncachableStripeClient();
      const prices = await stripe.prices.list({ active: true, limit: 100 });
      res.json({ data: prices.data });
    } catch (error: any) {
      console.error('Error fetching Stripe prices:', error);
      res.status(500).json({ message: 'Failed to fetch prices' });
    }
  });

  // Create checkout session for subscription
  app.post('/api/stripe/checkout', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { priceId, tier, interval, organizationId } = req.body;

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Create or get customer
      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const customer = await stripeService.createCustomer(user.email || '', userId, {
          organizationId: organizationId?.toString() || ''
        });
        await storage.updateUser(userId, { stripeCustomerId: customer.id });
        customerId = customer.id;
      }

      // Get Stripe client for creating prices on-the-fly if needed
      const { getUncachableStripeClient } = await import('./stripeClient');
      const stripe = await getUncachableStripeClient();

      // Tier pricing configuration (matching shared/schema.ts)
      const tierPricing: Record<string, { monthly: number; annual: number; name: string }> = {
        core: { monthly: 4900, annual: 3900, name: 'Core' },
        professional: { monthly: 12900, annual: 9900, name: 'Professional' },
        growth: { monthly: 24900, annual: 19900, name: 'Growth' },
        enterprise: { monthly: 0, annual: 0, name: 'Enterprise' }, // Custom pricing
      };

      let finalPriceId = priceId;

      // If tier-based checkout, find or create the price
      if (tier && interval && tierPricing[tier]) {
        const tierConfig = tierPricing[tier];
        const amount = interval === 'annual' ? tierConfig.annual : tierConfig.monthly;
        const intervalValue = interval === 'annual' ? 'year' : 'month';

        // Look for existing product for this tier
        const products = await stripe.products.list({ active: true, limit: 100 });
        let product = products.data.find(p => p.metadata?.tier === tier);

        if (!product) {
          // Create product for this tier
          product = await stripe.products.create({
            name: `ComplyBook ${tierConfig.name}`,
            metadata: { tier },
          });
        }

        // Look for existing price
        const prices = await stripe.prices.list({ 
          product: product.id, 
          active: true, 
          limit: 100 
        });
        let price = prices.data.find(p => 
          p.unit_amount === amount && 
          p.recurring?.interval === intervalValue
        );

        if (!price) {
          // Create price for this tier/interval
          price = await stripe.prices.create({
            product: product.id,
            unit_amount: amount,
            currency: 'usd',
            recurring: { interval: intervalValue },
            metadata: { tier, interval },
          });
        }

        finalPriceId = price.id;
      }

      if (!finalPriceId) {
        return res.status(400).json({ message: 'Price ID or tier/interval is required' });
      }

      // Check if user already had a subscription (no trial for returning customers)
      const hadPreviousSubscription = user.stripeSubscriptionId || user.subscriptionStatus === 'cancelled';
      const trialDays = hadPreviousSubscription ? 0 : 30; // 30-day trial for new subscribers only

      // Create checkout session with trial
      const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}`;
      const session = await stripeService.createCheckoutSession(
        customerId,
        finalPriceId,
        `${baseUrl}/checkout/success?tier=${tier || ''}&interval=${interval || ''}&trial=${trialDays > 0 ? 'true' : 'false'}`,
        `${baseUrl}/pricing`,
        { userId, tier: tier || '', interval: interval || '', organizationId: organizationId?.toString() || '' },
        trialDays
      );

      res.json({ url: session.url });
    } catch (error: any) {
      console.error('Error creating checkout session:', error);
      res.status(500).json({ message: 'Failed to create checkout session' });
    }
  });

  // Create customer portal session
  app.post('/api/stripe/customer-portal', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user?.stripeCustomerId) {
        return res.status(400).json({ message: 'No Stripe customer found' });
      }

      const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}`;
      const session = await stripeService.createCustomerPortalSession(
        user.stripeCustomerId,
        `${baseUrl}/pricing`
      );

      res.json({ url: session.url });
    } catch (error: any) {
      console.error('Error creating customer portal session:', error);
      res.status(500).json({ message: 'Failed to create customer portal session' });
    }
  });

  // Portal alias for convenience
  app.post('/api/stripe/portal', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user?.stripeCustomerId) {
        return res.status(400).json({ message: 'No Stripe customer found' });
      }

      const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}`;
      const session = await stripeService.createCustomerPortalSession(
        user.stripeCustomerId,
        `${baseUrl}/pricing`
      );

      res.json({ url: session.url });
    } catch (error: any) {
      console.error('Error creating customer portal session:', error);
      res.status(500).json({ message: 'Failed to create customer portal session' });
    }
  });

  // Get user subscription status
  app.get('/api/stripe/subscription', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user?.stripeSubscriptionId) {
        return res.json({ subscription: null });
      }

      // Get subscription from Stripe API
      const { getUncachableStripeClient } = await import('./stripeClient');
      const stripe = await getUncachableStripeClient();
      const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);

      res.json({ subscription });
    } catch (error: any) {
      console.error('Error fetching subscription:', error);
      res.status(500).json({ message: 'Failed to fetch subscription' });
    }
  });

  // Cancel subscription
  app.post('/api/stripe/subscription/cancel', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user?.stripeSubscriptionId) {
        return res.status(400).json({ message: 'No subscription found' });
      }

      await stripeService.cancelSubscription(user.stripeSubscriptionId);
      await storage.updateUser(userId, { stripeSubscriptionId: null });

      res.json({ message: 'Subscription cancelled successfully' });
    } catch (error: any) {
      console.error('Error cancelling subscription:', error);
      res.status(500).json({ message: 'Failed to cancel subscription' });
    }
  });

  // ============== PROPOSALS/BID MANAGEMENT ==============
  
  // Get all proposals for an organization
  app.get("/api/proposals/:organizationId", isAuthenticated, async (req: any, res: Response) => {
    try {
      const organizationId = parseInt(req.params.organizationId);
      const proposals = await storage.getProposals(organizationId);
      res.json(proposals);
    } catch (error: any) {
      console.error("Error fetching proposals:", error);
      res.status(500).json({ message: "Failed to fetch proposals" });
    }
  });

  // Create a new proposal
  app.post("/api/proposals", isAuthenticated, async (req: any, res: Response) => {
    try {
      const proposal = await storage.createProposal(req.body);
      res.status(201).json(proposal);
    } catch (error: any) {
      console.error("Error creating proposal:", error);
      res.status(500).json({ message: "Failed to create proposal" });
    }
  });

  // Update a proposal
  app.put("/api/proposals/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const proposal = await storage.updateProposal(id, req.body);
      res.json(proposal);
    } catch (error: any) {
      console.error("Error updating proposal:", error);
      res.status(500).json({ message: "Failed to update proposal" });
    }
  });

  // Delete a proposal
  app.delete("/api/proposals/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteProposal(id);
      res.json({ message: "Proposal deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting proposal:", error);
      res.status(500).json({ message: "Failed to delete proposal" });
    }
  });

  // ============== SUBCONTRACTOR MANAGEMENT ==============
  
  // Get all subcontractors for an organization
  app.get("/api/subcontractors/:organizationId", isAuthenticated, async (req: any, res: Response) => {
    try {
      const organizationId = parseInt(req.params.organizationId);
      const subcontractors = await storage.getSubcontractors(organizationId);
      res.json(subcontractors);
    } catch (error: any) {
      console.error("Error fetching subcontractors:", error);
      res.status(500).json({ message: "Failed to fetch subcontractors" });
    }
  });

  // Create a new subcontractor
  app.post("/api/subcontractors", isAuthenticated, async (req: any, res: Response) => {
    try {
      const subcontractor = await storage.createSubcontractor(req.body);
      res.status(201).json(subcontractor);
    } catch (error: any) {
      console.error("Error creating subcontractor:", error);
      res.status(500).json({ message: "Failed to create subcontractor" });
    }
  });

  // Update a subcontractor
  app.put("/api/subcontractors/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const subcontractor = await storage.updateSubcontractor(id, req.body);
      res.json(subcontractor);
    } catch (error: any) {
      console.error("Error updating subcontractor:", error);
      res.status(500).json({ message: "Failed to update subcontractor" });
    }
  });

  // Delete a subcontractor
  app.delete("/api/subcontractors/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteSubcontractor(id);
      res.json({ message: "Subcontractor deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting subcontractor:", error);
      res.status(500).json({ message: "Failed to delete subcontractor" });
    }
  });

  // ============== CHANGE ORDER MANAGEMENT ==============
  
  // Get all change orders for an organization
  app.get("/api/change-orders/:organizationId", isAuthenticated, async (req: any, res: Response) => {
    try {
      const organizationId = parseInt(req.params.organizationId);
      const changeOrders = await storage.getChangeOrders(organizationId);
      res.json(changeOrders);
    } catch (error: any) {
      console.error("Error fetching change orders:", error);
      res.status(500).json({ message: "Failed to fetch change orders" });
    }
  });

  // Create a new change order
  app.post("/api/change-orders", isAuthenticated, async (req: any, res: Response) => {
    try {
      const changeOrder = await storage.createChangeOrder(req.body);
      res.status(201).json(changeOrder);
    } catch (error: any) {
      console.error("Error creating change order:", error);
      res.status(500).json({ message: "Failed to create change order" });
    }
  });

  // Update a change order
  app.put("/api/change-orders/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const changeOrder = await storage.updateChangeOrder(id, req.body);
      res.json(changeOrder);
    } catch (error: any) {
      console.error("Error updating change order:", error);
      res.status(500).json({ message: "Failed to update change order" });
    }
  });

  // Delete a change order
  app.delete("/api/change-orders/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteChangeOrder(id);
      res.json({ message: "Change order deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting change order:", error);
      res.status(500).json({ message: "Failed to delete change order" });
    }
  });

  // ============== FORMS & SURVEYS ==============

  // Get all forms/surveys for an organization
  app.get("/api/forms/:organizationId", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);
      const formType = req.query.type as 'survey' | 'form' | undefined;

      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied" });
      }

      const forms = await storage.getForms(organizationId, formType);
      res.json({ data: forms });
    } catch (error: any) {
      console.error("Error fetching forms:", error);
      res.status(500).json({ message: "Failed to fetch forms" });
    }
  });

  // Get a single form with questions
  app.get("/api/forms/:organizationId/:formId", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = parseInt(req.params.organizationId);
      const formId = parseInt(req.params.formId);

      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied" });
      }

      const form = await storage.getForm(formId);
      if (!form || form.organizationId !== organizationId) {
        return res.status(404).json({ message: "Form not found" });
      }

      const questions = await storage.getFormQuestions(formId);
      res.json({ data: { ...form, questions } });
    } catch (error: any) {
      console.error("Error fetching form:", error);
      res.status(500).json({ message: "Failed to fetch form" });
    }
  });

  // Create a new form/survey
  app.post("/api/forms", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const { organizationId, ...formData } = req.body;

      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied" });
      }

      if (!hasPermission(userRole.role, userRole.permissions, 'edit_transactions')) {
        return res.status(403).json({ message: "You don't have permission to create forms" });
      }

      // Generate a unique public ID
      const publicId = crypto.randomBytes(16).toString('hex');

      const insertData = {
        title: formData.title,
        description: formData.description || null,
        formType: formData.formType || 'form',
        settings: formData.settings || {},
        branding: formData.branding || { useBranding: true },
        status: 'draft' as const,
        organizationId,
        publicId,
        createdBy: userId,
      };

      const form = await storage.createForm(insertData);

      res.status(201).json({ data: form });
    } catch (error: any) {
      console.error("Error creating form:", error);
      res.status(500).json({ message: "Failed to create form" });
    }
  });

  // Update a form
  app.patch("/api/forms/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const formId = parseInt(req.params.id);

      const form = await storage.getForm(formId);
      if (!form) {
        return res.status(404).json({ message: "Form not found" });
      }

      const userRole = await storage.getUserRole(userId, form.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied" });
      }

      if (!hasPermission(userRole.role, userRole.permissions, 'edit_transactions')) {
        return res.status(403).json({ message: "You don't have permission to update forms" });
      }

      const updatedForm = await storage.updateForm(formId, req.body);
      res.json({ data: updatedForm });
    } catch (error: any) {
      console.error("Error updating form:", error);
      res.status(500).json({ message: "Failed to update form" });
    }
  });

  // Delete a form
  app.delete("/api/forms/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const formId = parseInt(req.params.id);

      const form = await storage.getForm(formId);
      if (!form) {
        return res.status(404).json({ message: "Form not found" });
      }

      const userRole = await storage.getUserRole(userId, form.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied" });
      }

      if (!hasPermission(userRole.role, userRole.permissions, 'edit_transactions')) {
        return res.status(403).json({ message: "You don't have permission to delete forms" });
      }

      await storage.deleteForm(formId);
      res.json({ message: "Form deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting form:", error);
      res.status(500).json({ message: "Failed to delete form" });
    }
  });

  // Add a question to a form
  app.post("/api/forms/:formId/questions", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const formId = parseInt(req.params.formId);

      const form = await storage.getForm(formId);
      if (!form) {
        return res.status(404).json({ message: "Form not found" });
      }

      const userRole = await storage.getUserRole(userId, form.organizationId);
      if (!userRole || !hasPermission(userRole.role, userRole.permissions, 'edit_transactions')) {
        return res.status(403).json({ message: "Access denied" });
      }

      const question = await storage.createFormQuestion({
        ...req.body,
        formId,
      });

      res.status(201).json({ data: question });
    } catch (error: any) {
      console.error("Error creating question:", error);
      res.status(500).json({ message: "Failed to create question" });
    }
  });

  // Update a question
  app.patch("/api/forms/questions/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const questionId = parseInt(req.params.id);
      // Accept formId from query string or body for backward compatibility
      const formId = parseInt(req.query.formId as string) || parseInt(req.body.formId as string);
      
      if (!formId || isNaN(formId)) {
        return res.status(400).json({ message: "formId is required" });
      }

      const questions = await storage.getFormQuestions(formId);
      const question = questions.find(q => q.id === questionId);
      if (!question) {
        return res.status(404).json({ message: "Question not found" });
      }

      const form = await storage.getForm(question.formId);
      if (!form) {
        return res.status(404).json({ message: "Form not found" });
      }

      const userRole = await storage.getUserRole(userId, form.organizationId);
      if (!userRole || !hasPermission(userRole.role, userRole.permissions, 'edit_transactions')) {
        return res.status(403).json({ message: "Access denied" });
      }

      const updatedQuestion = await storage.updateFormQuestion(questionId, req.body);
      res.json({ data: updatedQuestion });
    } catch (error: any) {
      console.error("Error updating question:", error);
      res.status(500).json({ message: "Failed to update question" });
    }
  });

  // Delete a question
  app.delete("/api/forms/questions/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const questionId = parseInt(req.params.id);
      const formId = parseInt(req.query.formId as string);

      const form = await storage.getForm(formId);
      if (!form) {
        return res.status(404).json({ message: "Form not found" });
      }

      const userRole = await storage.getUserRole(userId, form.organizationId);
      if (!userRole || !hasPermission(userRole.role, userRole.permissions, 'edit_transactions')) {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.deleteFormQuestion(questionId);
      res.json({ message: "Question deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting question:", error);
      res.status(500).json({ message: "Failed to delete question" });
    }
  });

  // Reorder questions
  app.post("/api/forms/:formId/questions/reorder", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const formId = parseInt(req.params.formId);
      const { questionIds } = req.body;

      const form = await storage.getForm(formId);
      if (!form) {
        return res.status(404).json({ message: "Form not found" });
      }

      const userRole = await storage.getUserRole(userId, form.organizationId);
      if (!userRole || !hasPermission(userRole.role, userRole.permissions, 'edit_transactions')) {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.reorderFormQuestions(formId, questionIds);
      res.json({ message: "Questions reordered successfully" });
    } catch (error: any) {
      console.error("Error reordering questions:", error);
      res.status(500).json({ message: "Failed to reorder questions" });
    }
  });

  // Get form responses
  app.get("/api/forms/:formId/responses", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const formId = parseInt(req.params.formId);

      const form = await storage.getForm(formId);
      if (!form) {
        return res.status(404).json({ message: "Form not found" });
      }

      const userRole = await storage.getUserRole(userId, form.organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied" });
      }

      const responses = await storage.getFormResponses(formId);
      res.json({ data: responses });
    } catch (error: any) {
      console.error("Error fetching responses:", error);
      res.status(500).json({ message: "Failed to fetch responses" });
    }
  });

  // Delete a response
  app.delete("/api/forms/responses/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const responseId = parseInt(req.params.id);

      const response = await storage.getFormResponse(responseId);
      if (!response) {
        return res.status(404).json({ message: "Response not found" });
      }

      const form = await storage.getForm(response.formId);
      if (!form) {
        return res.status(404).json({ message: "Form not found" });
      }

      const userRole = await storage.getUserRole(userId, form.organizationId);
      if (!userRole || !hasPermission(userRole.role, userRole.permissions, 'edit_transactions')) {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.deleteFormResponse(responseId);
      res.json({ message: "Response deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting response:", error);
      res.status(500).json({ message: "Failed to delete response" });
    }
  });

  // PUBLIC ENDPOINTS - No authentication required

  // Get public form by public ID
  app.get("/api/public/forms/:publicId", async (req: any, res: Response) => {
    try {
      const form = await storage.getFormByPublicId(req.params.publicId);
      if (!form) {
        return res.status(404).json({ message: "Form not found" });
      }

      if (form.status !== 'active') {
        return res.status(403).json({ message: "This form is not currently accepting responses" });
      }

      // Get organization for branding
      const organization = await storage.getOrganization(form.organizationId);
      const questions = await storage.getFormQuestions(form.id);

      // Build branding from organization and form settings
      const branding = form.branding?.useBranding && organization ? {
        primaryColor: form.branding?.primaryColor || organization.invoicePrimaryColor || undefined,
        accentColor: form.branding?.accentColor || organization.invoiceAccentColor || undefined,
        fontFamily: form.branding?.fontFamily || organization.invoiceFontFamily || undefined,
        logoUrl: form.branding?.logoUrl || organization.logoUrl || undefined,
        headerImage: form.branding?.headerImage || undefined,
        organizationName: organization.companyName || organization.name,
      } : {
        organizationName: organization?.companyName || organization?.name || 'Organization',
      };

      res.json({
        data: {
          id: form.id,
          title: form.title,
          description: form.description,
          formType: form.formType,
          settings: form.settings,
          branding,
          questions,
        }
      });
    } catch (error: any) {
      console.error("Error fetching public form:", error);
      res.status(500).json({ message: "Failed to fetch form" });
    }
  });

  // Configure multer for public form file uploads
  const formFileUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
      // Allow common file types
      const allowedTypes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf',
        'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain', 'text/csv'
      ];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('File type not allowed'));
      }
    }
  });

  // Public form file upload endpoint
  app.post("/api/public/forms/upload", formFileUpload.single('file'), async (req: any, res: Response) => {
    try {
      const { formPublicId, questionId } = req.body;
      
      if (!formPublicId) {
        return res.status(400).json({ message: "Form ID is required" });
      }
      
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      // Verify form exists and is active
      const form = await storage.getFormByPublicId(formPublicId);
      if (!form) {
        return res.status(404).json({ message: "Form not found" });
      }
      if (form.status !== 'active') {
        return res.status(403).json({ message: "This form is not accepting responses" });
      }
      
      // Validate questionId exists on the form if provided
      if (questionId) {
        const questions = await storage.getFormQuestions(form.id);
        const question = questions.find(q => q.id === parseInt(questionId));
        if (!question || question.questionType !== 'file_upload') {
          return res.status(400).json({ message: "Invalid question for file upload" });
        }
      }

      // Generate unique filename
      const timestamp = Date.now();
      const sanitizedName = req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
      const fileName = `form-uploads/${formPublicId}/${timestamp}-${sanitizedName}`;

      // Store file using object storage if available, otherwise save locally
      let fileUrl: string;
      
      if (process.env.REPLIT_DEPLOYMENT || process.env.REPL_ID) {
        // Use object storage on Replit - use /objects/ prefix to match existing route
        const { Client } = await import("@replit/object-storage");
        const client = new Client();
        await client.uploadFromBytes(fileName, req.file.buffer);
        fileUrl = `/objects/${fileName}`;
      } else {
        // Save locally for non-Replit environments
        const fs = await import('fs/promises');
        const uploadsDir = path.join(process.cwd(), 'uploads', 'form-uploads', formPublicId);
        await fs.mkdir(uploadsDir, { recursive: true });
        const localPath = path.join(uploadsDir, `${timestamp}-${sanitizedName}`);
        await fs.writeFile(localPath, req.file.buffer);
        fileUrl = `/uploads/form-uploads/${formPublicId}/${timestamp}-${sanitizedName}`;
      }

      res.json({ 
        url: fileUrl,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        fileType: req.file.mimetype
      });
    } catch (error: any) {
      console.error("Error uploading form file:", error);
      res.status(500).json({ message: "Failed to upload file" });
    }
  });

  // Submit a public form response
  app.post("/api/public/forms/:publicId/submit", async (req: any, res: Response) => {
    try {
      const form = await storage.getFormByPublicId(req.params.publicId);
      if (!form) {
        return res.status(404).json({ message: "Form not found" });
      }

      if (form.status !== 'active') {
        return res.status(403).json({ message: "This form is not currently accepting responses" });
      }

      const { answers, respondentEmail, respondentName } = req.body;

      const response = await storage.createFormResponse({
        formId: form.id,
        answers,
        respondentEmail,
        respondentName,
        metadata: {
          userAgent: req.headers['user-agent'],
          referrer: req.headers.referer,
        },
      });

      // Increment response count
      await storage.incrementFormResponseCount(form.id);

      res.status(201).json({
        message: form.settings?.confirmationMessage || "Thank you for your response!",
        data: { id: response.id },
      });
    } catch (error: any) {
      console.error("Error submitting form response:", error);
      res.status(500).json({ message: "Failed to submit response" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
