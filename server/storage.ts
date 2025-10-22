// Referenced from javascript_database and javascript_log_in_with_replit blueprints
import {
  users,
  organizations,
  userOrganizationRoles,
  categories,
  transactions,
  grants,
  type User,
  type UpsertUser,
  type Organization,
  type InsertOrganization,
  type UserOrganizationRole,
  type InsertUserOrganizationRole,
  type Category,
  type InsertCategory,
  type Transaction,
  type InsertTransaction,
  type Grant,
  type InsertGrant,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations (IMPORTANT: mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Organization operations
  getOrganizations(userId: string): Promise<Array<Organization & { userRole: string }>>;
  getOrganization(id: number): Promise<Organization | undefined>;
  createOrganization(org: InsertOrganization, userId: string): Promise<Organization>;

  // User organization role operations
  getUserRole(userId: string, organizationId: number): Promise<UserOrganizationRole | undefined>;
  createUserRole(role: InsertUserOrganizationRole): Promise<UserOrganizationRole>;

  // Category operations
  getCategories(organizationId: number): Promise<Category[]>;
  createCategory(category: InsertCategory): Promise<Category>;

  // Transaction operations
  getTransactions(organizationId: number): Promise<Transaction[]>;
  getTransactionsByDateRange(organizationId: number, startDate: Date, endDate: Date): Promise<Transaction[]>;
  getRecentTransactions(organizationId: number, limit: number): Promise<Transaction[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;

  // Grant operations
  getGrants(organizationId: number): Promise<Array<Grant & { totalSpent: string }>>;
  createGrant(grant: InsertGrant): Promise<Grant>;

  // Dashboard/Report operations
  getDashboardStats(organizationId: number): Promise<{
    totalIncome: string;
    totalExpenses: string;
    netIncome: string;
    transactionCount: number;
    recentTransactions: Transaction[];
  }>;
  getProfitLossReport(organizationId: number, startDate: Date, endDate: Date): Promise<{
    totalIncome: string;
    totalExpenses: string;
    netIncome: string;
    incomeByCategory: Array<{ categoryName: string; amount: string }>;
    expensesByCategory: Array<{ categoryName: string; amount: string }>;
  }>;
}

export class DatabaseStorage implements IStorage {
  // User operations (IMPORTANT: mandatory for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Organization operations
  async getOrganizations(userId: string): Promise<Array<Organization & { userRole: string }>> {
    const result = await db
      .select({
        organization: organizations,
        role: userOrganizationRoles.role,
      })
      .from(organizations)
      .innerJoin(
        userOrganizationRoles,
        eq(organizations.id, userOrganizationRoles.organizationId)
      )
      .where(eq(userOrganizationRoles.userId, userId));

    return result.map(r => ({
      ...r.organization,
      userRole: r.role,
    }));
  }

  async getOrganization(id: number): Promise<Organization | undefined> {
    const [org] = await db.select().from(organizations).where(eq(organizations.id, id));
    return org;
  }

  async createOrganization(orgData: InsertOrganization, userId: string): Promise<Organization> {
    const [org] = await db
      .insert(organizations)
      .values(orgData)
      .returning();

    // Create owner role for the user
    await db.insert(userOrganizationRoles).values({
      userId,
      organizationId: org.id,
      role: 'owner',
    });

    return org;
  }

  // User organization role operations
  async getUserRole(userId: string, organizationId: number): Promise<UserOrganizationRole | undefined> {
    const [role] = await db
      .select()
      .from(userOrganizationRoles)
      .where(
        and(
          eq(userOrganizationRoles.userId, userId),
          eq(userOrganizationRoles.organizationId, organizationId)
        )
      );
    return role;
  }

  async createUserRole(roleData: InsertUserOrganizationRole): Promise<UserOrganizationRole> {
    const [role] = await db
      .insert(userOrganizationRoles)
      .values(roleData)
      .returning();
    return role;
  }

  // Category operations
  async getCategories(organizationId: number): Promise<Category[]> {
    return await db
      .select()
      .from(categories)
      .where(eq(categories.organizationId, organizationId));
  }

  async createCategory(categoryData: InsertCategory): Promise<Category> {
    const [category] = await db
      .insert(categories)
      .values(categoryData)
      .returning();
    return category;
  }

  // Transaction operations
  async getTransactions(organizationId: number): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .where(eq(transactions.organizationId, organizationId))
      .orderBy(desc(transactions.date), desc(transactions.id));
  }

  async getTransactionsByDateRange(
    organizationId: number,
    startDate: Date,
    endDate: Date
  ): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.organizationId, organizationId),
          gte(transactions.date, startDate),
          lte(transactions.date, endDate)
        )
      )
      .orderBy(desc(transactions.date));
  }

  async getRecentTransactions(organizationId: number, limit: number): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .where(eq(transactions.organizationId, organizationId))
      .orderBy(desc(transactions.date), desc(transactions.id))
      .limit(limit);
  }

  async createTransaction(transactionData: InsertTransaction): Promise<Transaction> {
    const [transaction] = await db
      .insert(transactions)
      .values(transactionData)
      .returning();
    return transaction;
  }

  // Grant operations
  async getGrants(organizationId: number): Promise<Array<Grant & { totalSpent: string }>> {
    const grantsData = await db
      .select()
      .from(grants)
      .where(eq(grants.organizationId, organizationId))
      .orderBy(desc(grants.createdAt));

    // Calculate spent amount for each grant
    const grantsWithSpent = await Promise.all(
      grantsData.map(async (grant) => {
        const [result] = await db
          .select({
            totalSpent: sql<string>`COALESCE(SUM(${transactions.amount}), 0)`,
          })
          .from(transactions)
          .where(
            and(
              eq(transactions.grantId, grant.id),
              eq(transactions.type, 'expense')
            )
          );

        return {
          ...grant,
          totalSpent: result?.totalSpent || '0',
        };
      })
    );

    return grantsWithSpent;
  }

  async createGrant(grantData: InsertGrant): Promise<Grant> {
    const [grant] = await db
      .insert(grants)
      .values(grantData)
      .returning();
    return grant;
  }

  // Dashboard/Report operations
  async getDashboardStats(organizationId: number): Promise<{
    totalIncome: string;
    totalExpenses: string;
    netIncome: string;
    transactionCount: number;
    recentTransactions: Transaction[];
  }> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Get income and expenses for current month
    const [incomeResult] = await db
      .select({
        total: sql<string>`COALESCE(SUM(${transactions.amount}), 0)`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.organizationId, organizationId),
          eq(transactions.type, 'income'),
          gte(transactions.date, startOfMonth),
          lte(transactions.date, endOfMonth)
        )
      );

    const [expenseResult] = await db
      .select({
        total: sql<string>`COALESCE(SUM(${transactions.amount}), 0)`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.organizationId, organizationId),
          eq(transactions.type, 'expense'),
          gte(transactions.date, startOfMonth),
          lte(transactions.date, endOfMonth)
        )
      );

    const [countResult] = await db
      .select({
        count: sql<number>`COUNT(*)::int`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.organizationId, organizationId),
          gte(transactions.date, startOfMonth),
          lte(transactions.date, endOfMonth)
        )
      );

    const recentTransactions = await this.getRecentTransactions(organizationId, 5);

    const totalIncome = incomeResult?.total || '0';
    const totalExpenses = expenseResult?.total || '0';
    const netIncome = (parseFloat(totalIncome) - parseFloat(totalExpenses)).toFixed(2);

    return {
      totalIncome,
      totalExpenses,
      netIncome,
      transactionCount: countResult?.count || 0,
      recentTransactions,
    };
  }

  async getProfitLossReport(
    organizationId: number,
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalIncome: string;
    totalExpenses: string;
    netIncome: string;
    incomeByCategory: Array<{ categoryName: string; amount: string }>;
    expensesByCategory: Array<{ categoryName: string; amount: string }>;
  }> {
    // Get total income
    const [incomeResult] = await db
      .select({
        total: sql<string>`COALESCE(SUM(${transactions.amount}), 0)`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.organizationId, organizationId),
          eq(transactions.type, 'income'),
          gte(transactions.date, startDate),
          lte(transactions.date, endDate)
        )
      );

    // Get total expenses
    const [expenseResult] = await db
      .select({
        total: sql<string>`COALESCE(SUM(${transactions.amount}), 0)`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.organizationId, organizationId),
          eq(transactions.type, 'expense'),
          gte(transactions.date, startDate),
          lte(transactions.date, endDate)
        )
      );

    // Get income by category
    const incomeByCategory = await db
      .select({
        categoryName: sql<string>`COALESCE(${categories.name}, 'Uncategorized')`,
        amount: sql<string>`SUM(${transactions.amount})`,
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(
        and(
          eq(transactions.organizationId, organizationId),
          eq(transactions.type, 'income'),
          gte(transactions.date, startDate),
          lte(transactions.date, endDate)
        )
      )
      .groupBy(categories.name);

    // Get expenses by category
    const expensesByCategory = await db
      .select({
        categoryName: sql<string>`COALESCE(${categories.name}, 'Uncategorized')`,
        amount: sql<string>`SUM(${transactions.amount})`,
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(
        and(
          eq(transactions.organizationId, organizationId),
          eq(transactions.type, 'expense'),
          gte(transactions.date, startDate),
          lte(transactions.date, endDate)
        )
      )
      .groupBy(categories.name);

    const totalIncome = incomeResult?.total || '0';
    const totalExpenses = expenseResult?.total || '0';
    const netIncome = (parseFloat(totalIncome) - parseFloat(totalExpenses)).toFixed(2);

    return {
      totalIncome,
      totalExpenses,
      netIncome,
      incomeByCategory,
      expensesByCategory,
    };
  }
}

export const storage = new DatabaseStorage();
