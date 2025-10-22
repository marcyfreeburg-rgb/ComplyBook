// Referenced from javascript_log_in_with_replit blueprint
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
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

  const httpServer = createServer(app);
  return httpServer;
}
