// Referenced from javascript_log_in_with_replit blueprint
import type { Express } from "express";
import { createServer, type Server } from "http";
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
  type InsertOrganization,
  type InsertCategory,
  type InsertTransaction,
  type InsertGrant,
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
      
      // Check user has access to this organization
      const userRole = await storage.getUserRole(userId, data.organizationId);
      if (!userRole || userRole.role === 'viewer') {
        return res.status(403).json({ message: "Access denied" });
      }

      const transaction = await storage.createTransaction(data);
      res.status(201).json(transaction);
    } catch (error) {
      console.error("Error creating transaction:", error);
      res.status(400).json({ message: "Failed to create transaction" });
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

      res.json(suggestion);
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

      // Convert Map to object for JSON response
      const suggestionsObj: Record<number, any> = {};
      suggestions.forEach((value, key) => {
        suggestionsObj[key] = value;
      });

      res.json(suggestionsObj);
    } catch (error) {
      console.error("Error suggesting categories in bulk:", error);
      res.status(500).json({ message: "Failed to suggest categories" });
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
      
      // Check user has access to this organization
      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
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
      
      // Check user has access to this organization
      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
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
      
      // Check user has access to this organization
      const userRole = await storage.getUserRole(userId, organizationId);
      if (!userRole) {
        return res.status(403).json({ message: "Access denied to this organization" });
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

  const httpServer = createServer(app);
  return httpServer;
}
