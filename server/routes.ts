// Referenced from javascript_log_in_with_replit blueprint
import type { Express } from "express";
import { createServer, type Server } from "http";
import crypto from "crypto";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { plaidClient } from "./plaid";
import { suggestCategory, suggestCategoryBulk } from "./aiCategorization";
import memoize from "memoizee";
import {
  insertOrganizationSchema,
  insertCategorySchema,
  insertTransactionSchema,
  insertGrantSchema,
  insertBudgetSchema,
  insertBudgetItemSchema,
  insertInvitationSchema,
  type InsertOrganization,
  type InsertCategory,
  type InsertTransaction,
  type InsertGrant,
  type InsertBudget,
  type InsertBudgetItem,
  type InsertInvitation,
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
      
      // Return invitation link
      const inviteLink = `${req.protocol}://${req.get('host')}/invite/${token}`;
      res.status(201).json({ ...invitation, inviteLink });
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

  app.post('/api/invitations/:token/accept', isAuthenticated, async (req: any, res) => {
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
      const updates = req.body;

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
      res.status(200).json({ message: "Transaction deleted successfully" });
    } catch (error) {
      console.error("Error deleting transaction:", error);
      res.status(500).json({ message: "Failed to delete transaction" });
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
      res.status(201).json(grant);
    } catch (error) {
      console.error("Error creating grant:", error);
      res.status(400).json({ message: "Failed to create grant" });
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

  const httpServer = createServer(app);
  return httpServer;
}
