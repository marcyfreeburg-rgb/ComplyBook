// Referenced from javascript_database and javascript_log_in_with_replit blueprints
import {
  users,
  organizations,
  userOrganizationRoles,
  categories,
  transactions,
  grants,
  budgets,
  budgetItems,
  plaidItems,
  plaidAccounts,
  categorizationHistory,
  invitations,
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
  type Budget,
  type InsertBudget,
  type BudgetItem,
  type InsertBudgetItem,
  type PlaidItem,
  type InsertPlaidItem,
  type PlaidAccount,
  type InsertPlaidAccount,
  type CategorizationHistory,
  type InsertCategorizationHistory,
  type Invitation,
  type InsertInvitation,
  recurringTransactions,
  type RecurringTransaction,
  type InsertRecurringTransaction,
  transactionAttachments,
  type TransactionAttachment,
  type InsertTransactionAttachment,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";
import memoize from "memoizee";

// Interface for storage operations
export interface IStorage {
  // User operations (IMPORTANT: mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
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
  getCategory(id: number): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: number, updates: Partial<InsertCategory>): Promise<Category>;
  deleteCategory(id: number): Promise<void>;

  // Transaction operations
  getTransaction(id: number): Promise<Transaction | undefined>;
  getTransactions(organizationId: number): Promise<Transaction[]>;
  getTransactionsByDateRange(organizationId: number, startDate: Date, endDate: Date): Promise<Transaction[]>;
  getRecentTransactions(organizationId: number, limit: number): Promise<Transaction[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  updateTransaction(id: number, updates: Partial<InsertTransaction>): Promise<Transaction>;
  deleteTransaction(id: number): Promise<void>;

  // Grant operations
  getGrants(organizationId: number): Promise<Array<Grant & { totalSpent: string }>>;
  createGrant(grant: InsertGrant): Promise<Grant>;

  // Budget operations
  getBudgets(organizationId: number): Promise<Budget[]>;
  getBudget(id: number): Promise<Budget | undefined>;
  createBudget(budget: InsertBudget): Promise<Budget>;
  updateBudget(id: number, updates: Partial<InsertBudget>): Promise<Budget>;
  deleteBudget(id: number): Promise<void>;
  getBudgetItems(budgetId: number): Promise<Array<BudgetItem & { categoryName: string }>>;
  createBudgetItem(item: InsertBudgetItem): Promise<BudgetItem>;
  updateBudgetItem(id: number, updates: Partial<InsertBudgetItem>): Promise<BudgetItem>;
  deleteBudgetItem(id: number): Promise<void>;
  getBudgetVsActual(budgetId: number): Promise<Array<{
    categoryId: number;
    categoryName: string;
    budgeted: string;
    actual: string;
    difference: string;
    percentUsed: number;
  }>>;

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

  getBalanceSheetReport(organizationId: number, asOfDate: Date): Promise<{
    totalAssets: string;
    totalLiabilities: string;
    totalEquity: string;
    assetsByCategory: Array<{ categoryName: string; amount: string }>;
    liabilitiesByCategory: Array<{ categoryName: string; amount: string }>;
    equityByCategory: Array<{ categoryName: string; amount: string }>;
  }>;

  // Plaid operations
  getPlaidItems(organizationId: number): Promise<PlaidItem[]>;
  getPlaidItem(itemId: string): Promise<PlaidItem | undefined>;
  createPlaidItem(item: InsertPlaidItem): Promise<PlaidItem>;
  deletePlaidItem(id: number): Promise<void>;
  getPlaidAccounts(plaidItemId: number): Promise<PlaidAccount[]>;
  getAllPlaidAccounts(organizationId: number): Promise<Array<PlaidAccount & { institutionName: string | null; itemId: string }>>;
  createPlaidAccount(account: InsertPlaidAccount): Promise<PlaidAccount>;
  updatePlaidAccountBalances(accountId: string, currentBalance: string, availableBalance: string): Promise<void>;

  // AI Categorization history operations
  recordCategorizationSuggestion(history: InsertCategorizationHistory): Promise<CategorizationHistory>;
  updateCategorizationDecision(id: number, userDecision: 'accepted' | 'rejected' | 'modified', finalCategoryId?: number): Promise<void>;
  getCategorizationHistory(organizationId: number, limit?: number): Promise<CategorizationHistory[]>;

  // Invitation operations
  createInvitation(invitation: InsertInvitation): Promise<Invitation>;
  getInvitationByToken(token: string): Promise<Invitation | undefined>;
  getInvitations(organizationId: number): Promise<Array<Invitation & { inviterName: string }>>;
  updateInvitationStatus(id: number, status: 'accepted' | 'expired' | 'cancelled' | 'declined'): Promise<void>;
  deleteInvitation(id: number): Promise<void>;
  
  // Team member operations
  getTeamMembers(organizationId: number): Promise<Array<{
    userId: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    role: string;
    permissions: string | null;
    createdAt: Date;
  }>>;
  updateUserPermissions(userId: string, organizationId: number, permissions: string): Promise<void>;
  removeTeamMember(userId: string, organizationId: number): Promise<void>;

  // Recurring transaction operations
  getRecurringTransactions(organizationId: number): Promise<RecurringTransaction[]>;
  getRecurringTransaction(id: number): Promise<RecurringTransaction | undefined>;
  createRecurringTransaction(transaction: InsertRecurringTransaction): Promise<RecurringTransaction>;
  updateRecurringTransaction(id: number, updates: Partial<InsertRecurringTransaction>): Promise<RecurringTransaction>;
  deleteRecurringTransaction(id: number): Promise<void>;
  updateRecurringTransactionLastGenerated(id: number, date: Date): Promise<void>;

  // Transaction attachment operations
  getTransactionAttachments(transactionId: number): Promise<TransactionAttachment[]>;
  createTransactionAttachment(attachment: InsertTransactionAttachment): Promise<TransactionAttachment>;
  deleteTransactionAttachment(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations (IMPORTANT: mandatory for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // Try to insert, but if the user already exists (by ID), update it
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          profileImageUrl: userData.profileImageUrl,
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

  async getCategory(id: number): Promise<Category | undefined> {
    const [category] = await db
      .select()
      .from(categories)
      .where(eq(categories.id, id));
    return category;
  }

  async createCategory(categoryData: InsertCategory): Promise<Category> {
    const [category] = await db
      .insert(categories)
      .values(categoryData)
      .returning();
    return category;
  }

  async updateCategory(id: number, updates: Partial<InsertCategory>): Promise<Category> {
    const [category] = await db
      .update(categories)
      .set(updates)
      .where(eq(categories.id, id))
      .returning();
    return category;
  }

  async deleteCategory(id: number): Promise<void> {
    await db.delete(categories).where(eq(categories.id, id));
  }

  // Transaction operations
  async getTransaction(id: number): Promise<Transaction | undefined> {
    const [transaction] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, id));
    return transaction;
  }

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

  async updateTransaction(id: number, updates: Partial<InsertTransaction>): Promise<Transaction> {
    const [transaction] = await db
      .update(transactions)
      .set(updates)
      .where(eq(transactions.id, id))
      .returning();
    return transaction;
  }

  async deleteTransaction(id: number): Promise<void> {
    await db
      .delete(transactions)
      .where(eq(transactions.id, id));
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

  // Budget operations
  async getBudgets(organizationId: number): Promise<Budget[]> {
    return await db
      .select()
      .from(budgets)
      .where(eq(budgets.organizationId, organizationId))
      .orderBy(desc(budgets.createdAt));
  }

  async getBudget(id: number): Promise<Budget | undefined> {
    const [budget] = await db
      .select()
      .from(budgets)
      .where(eq(budgets.id, id));
    return budget;
  }

  async createBudget(budgetData: InsertBudget): Promise<Budget> {
    const [budget] = await db
      .insert(budgets)
      .values(budgetData)
      .returning();
    return budget;
  }

  async updateBudget(id: number, updates: Partial<InsertBudget>): Promise<Budget> {
    const [budget] = await db
      .update(budgets)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(budgets.id, id))
      .returning();
    return budget;
  }

  async deleteBudget(id: number): Promise<void> {
    await db.delete(budgets).where(eq(budgets.id, id));
  }

  async getBudgetItems(budgetId: number): Promise<Array<BudgetItem & { categoryName: string }>> {
    const results = await db
      .select({
        item: budgetItems,
        categoryName: categories.name,
      })
      .from(budgetItems)
      .innerJoin(categories, eq(budgetItems.categoryId, categories.id))
      .where(eq(budgetItems.budgetId, budgetId));

    return results.map(r => ({
      ...r.item,
      categoryName: r.categoryName,
    }));
  }

  async createBudgetItem(itemData: InsertBudgetItem): Promise<BudgetItem> {
    const [item] = await db
      .insert(budgetItems)
      .values(itemData)
      .returning();
    return item;
  }

  async updateBudgetItem(id: number, updates: Partial<InsertBudgetItem>): Promise<BudgetItem> {
    const [item] = await db
      .update(budgetItems)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(budgetItems.id, id))
      .returning();
    return item;
  }

  async deleteBudgetItem(id: number): Promise<void> {
    await db.delete(budgetItems).where(eq(budgetItems.id, id));
  }

  async getBudgetVsActual(budgetId: number): Promise<Array<{
    categoryId: number;
    categoryName: string;
    budgeted: string;
    actual: string;
    difference: string;
    percentUsed: number;
  }>> {
    // Get the budget with its period
    const budget = await this.getBudget(budgetId);
    if (!budget) {
      return [];
    }

    // Get budget items
    const items = await this.getBudgetItems(budgetId);

    // Get actual spending for each category during the budget period
    const results = [];
    for (const item of items) {
      const [actualResult] = await db
        .select({
          total: sql<string>`COALESCE(SUM(${transactions.amount}), 0)`,
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.categoryId, item.categoryId),
            eq(transactions.type, 'expense'),
            gte(transactions.date, budget.startDate),
            lte(transactions.date, budget.endDate)
          )
        );

      const budgeted = parseFloat(item.amount);
      const actual = parseFloat(actualResult?.total || '0');
      const difference = budgeted - actual;
      const percentUsed = budgeted > 0 ? (actual / budgeted) * 100 : 0;

      results.push({
        categoryId: item.categoryId,
        categoryName: item.categoryName,
        budgeted: item.amount,
        actual: actualResult?.total || '0',
        difference: difference.toFixed(2),
        percentUsed: Math.round(percentUsed),
      });
    }

    return results;
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

  async getBalanceSheetReport(
    organizationId: number,
    asOfDate: Date
  ): Promise<{
    totalAssets: string;
    totalLiabilities: string;
    totalEquity: string;
    assetsByCategory: Array<{ categoryName: string; amount: string }>;
    liabilitiesByCategory: Array<{ categoryName: string; amount: string }>;
    equityByCategory: Array<{ categoryName: string; amount: string }>;
  }> {
    const startTime = Date.now();
    const cacheKey = `balance-sheet-${organizationId}-${asOfDate.toISOString()}`;
    
    console.log(`[Balance Sheet] Starting query for org ${organizationId}, asOfDate ${asOfDate.toISOString()}`);

    // Get total assets (sum of all transactions in asset categories up to date)
    const [assetsResult] = await db
      .select({
        total: sql<string>`COALESCE(SUM(${transactions.amount}), 0)`,
      })
      .from(transactions)
      .innerJoin(categories, eq(transactions.categoryId, categories.id))
      .where(
        and(
          eq(transactions.organizationId, organizationId),
          eq(categories.type, 'asset'),
          lte(transactions.date, asOfDate)
        )
      );

    // Get total liabilities
    const [liabilitiesResult] = await db
      .select({
        total: sql<string>`COALESCE(SUM(${transactions.amount}), 0)`,
      })
      .from(transactions)
      .innerJoin(categories, eq(transactions.categoryId, categories.id))
      .where(
        and(
          eq(transactions.organizationId, organizationId),
          eq(categories.type, 'liability'),
          lte(transactions.date, asOfDate)
        )
      );

    // Get total equity
    const [equityResult] = await db
      .select({
        total: sql<string>`COALESCE(SUM(${transactions.amount}), 0)`,
      })
      .from(transactions)
      .innerJoin(categories, eq(transactions.categoryId, categories.id))
      .where(
        and(
          eq(transactions.organizationId, organizationId),
          eq(categories.type, 'equity'),
          lte(transactions.date, asOfDate)
        )
      );

    // Get assets by category
    const assetsByCategory = await db
      .select({
        categoryName: categories.name,
        amount: sql<string>`SUM(${transactions.amount})`,
      })
      .from(transactions)
      .innerJoin(categories, eq(transactions.categoryId, categories.id))
      .where(
        and(
          eq(transactions.organizationId, organizationId),
          eq(categories.type, 'asset'),
          lte(transactions.date, asOfDate)
        )
      )
      .groupBy(categories.name)
      .orderBy(categories.name);

    // Get liabilities by category
    const liabilitiesByCategory = await db
      .select({
        categoryName: categories.name,
        amount: sql<string>`SUM(${transactions.amount})`,
      })
      .from(transactions)
      .innerJoin(categories, eq(transactions.categoryId, categories.id))
      .where(
        and(
          eq(transactions.organizationId, organizationId),
          eq(categories.type, 'liability'),
          lte(transactions.date, asOfDate)
        )
      )
      .groupBy(categories.name)
      .orderBy(categories.name);

    // Get equity by category
    const equityByCategory = await db
      .select({
        categoryName: categories.name,
        amount: sql<string>`SUM(${transactions.amount})`,
      })
      .from(transactions)
      .innerJoin(categories, eq(transactions.categoryId, categories.id))
      .where(
        and(
          eq(transactions.organizationId, organizationId),
          eq(categories.type, 'equity'),
          lte(transactions.date, asOfDate)
        )
      )
      .groupBy(categories.name)
      .orderBy(categories.name);

    const totalAssets = assetsResult?.total || '0';
    const totalLiabilities = liabilitiesResult?.total || '0';
    const totalEquity = equityResult?.total || '0';

    const executionTime = Date.now() - startTime;
    console.log(`[Balance Sheet] Query completed in ${executionTime}ms for org ${organizationId}`);
    console.log(`[Balance Sheet] Results: Assets=${totalAssets}, Liabilities=${totalLiabilities}, Equity=${totalEquity}`);

    return {
      totalAssets,
      totalLiabilities,
      totalEquity,
      assetsByCategory: assetsByCategory.length > 0 ? assetsByCategory : [],
      liabilitiesByCategory: liabilitiesByCategory.length > 0 ? liabilitiesByCategory : [],
      equityByCategory: equityByCategory.length > 0 ? equityByCategory : [],
    };
  }

  // Plaid operations
  async getPlaidItems(organizationId: number): Promise<PlaidItem[]> {
    return await db
      .select()
      .from(plaidItems)
      .where(eq(plaidItems.organizationId, organizationId))
      .orderBy(desc(plaidItems.createdAt));
  }

  async getPlaidItem(itemId: string): Promise<PlaidItem | undefined> {
    const [item] = await db
      .select()
      .from(plaidItems)
      .where(eq(plaidItems.itemId, itemId));
    return item;
  }

  async createPlaidItem(item: InsertPlaidItem): Promise<PlaidItem> {
    const [plaidItem] = await db
      .insert(plaidItems)
      .values(item)
      .returning();
    return plaidItem;
  }

  async deletePlaidItem(id: number): Promise<void> {
    await db.delete(plaidItems).where(eq(plaidItems.id, id));
  }

  async getPlaidAccounts(plaidItemId: number): Promise<PlaidAccount[]> {
    return await db
      .select()
      .from(plaidAccounts)
      .where(eq(plaidAccounts.plaidItemId, plaidItemId));
  }

  async getAllPlaidAccounts(organizationId: number): Promise<Array<PlaidAccount & { institutionName: string | null; itemId: string }>> {
    const results = await db
      .select({
        account: plaidAccounts,
        institutionName: plaidItems.institutionName,
        itemId: plaidItems.itemId,
      })
      .from(plaidAccounts)
      .innerJoin(plaidItems, eq(plaidAccounts.plaidItemId, plaidItems.id))
      .where(eq(plaidItems.organizationId, organizationId))
      .orderBy(desc(plaidAccounts.createdAt));

    return results.map(r => ({
      ...r.account,
      institutionName: r.institutionName,
      itemId: r.itemId,
    }));
  }

  async createPlaidAccount(account: InsertPlaidAccount): Promise<PlaidAccount> {
    const [plaidAccount] = await db
      .insert(plaidAccounts)
      .values(account)
      .returning();
    return plaidAccount;
  }

  async updatePlaidAccountBalances(accountId: string, currentBalance: string, availableBalance: string): Promise<void> {
    await db
      .update(plaidAccounts)
      .set({
        currentBalance,
        availableBalance,
        updatedAt: new Date(),
      })
      .where(eq(plaidAccounts.accountId, accountId));
  }

  // AI Categorization history operations
  async recordCategorizationSuggestion(history: InsertCategorizationHistory): Promise<CategorizationHistory> {
    const [record] = await db
      .insert(categorizationHistory)
      .values(history)
      .returning();
    return record;
  }

  async updateCategorizationDecision(
    id: number,
    userDecision: 'accepted' | 'rejected' | 'modified',
    finalCategoryId?: number
  ): Promise<void> {
    await db
      .update(categorizationHistory)
      .set({
        userDecision,
        finalCategoryId: finalCategoryId ?? null,
      })
      .where(eq(categorizationHistory.id, id));
  }

  async getCategorizationHistory(organizationId: number, limit: number = 100): Promise<CategorizationHistory[]> {
    return await db
      .select()
      .from(categorizationHistory)
      .where(eq(categorizationHistory.organizationId, organizationId))
      .orderBy(desc(categorizationHistory.createdAt))
      .limit(limit);
  }

  // Invitation operations
  async createInvitation(invitationData: InsertInvitation): Promise<Invitation> {
    const [invitation] = await db
      .insert(invitations)
      .values(invitationData)
      .returning();
    return invitation;
  }

  async getInvitationByToken(token: string): Promise<Invitation | undefined> {
    const [invitation] = await db
      .select()
      .from(invitations)
      .where(eq(invitations.token, token));
    return invitation;
  }

  async getInvitations(organizationId: number): Promise<Array<Invitation & { inviterName: string }>> {
    const results = await db
      .select({
        invitation: invitations,
        inviterFirstName: users.firstName,
        inviterLastName: users.lastName,
      })
      .from(invitations)
      .innerJoin(users, eq(invitations.invitedBy, users.id))
      .where(eq(invitations.organizationId, organizationId))
      .orderBy(desc(invitations.createdAt));

    return results.map(r => ({
      ...r.invitation,
      inviterName: `${r.inviterFirstName || ''} ${r.inviterLastName || ''}`.trim() || 'Unknown',
    }));
  }

  async updateInvitationStatus(id: number, status: 'accepted' | 'expired' | 'cancelled' | 'declined'): Promise<void> {
    await db
      .update(invitations)
      .set({
        status,
        acceptedAt: status === 'accepted' ? new Date() : null,
      })
      .where(eq(invitations.id, id));
  }

  async deleteInvitation(id: number): Promise<void> {
    await db.delete(invitations).where(eq(invitations.id, id));
  }

  // Team member operations
  async getTeamMembers(organizationId: number): Promise<Array<{
    userId: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    role: string;
    permissions: string | null;
    createdAt: Date;
  }>> {
    const results = await db
      .select({
        userId: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: userOrganizationRoles.role,
        permissions: userOrganizationRoles.permissions,
        createdAt: userOrganizationRoles.createdAt,
      })
      .from(userOrganizationRoles)
      .innerJoin(users, eq(userOrganizationRoles.userId, users.id))
      .where(eq(userOrganizationRoles.organizationId, organizationId))
      .orderBy(desc(userOrganizationRoles.createdAt));

    return results;
  }

  async updateUserPermissions(userId: string, organizationId: number, permissions: string): Promise<void> {
    await db
      .update(userOrganizationRoles)
      .set({ permissions: permissions as any })
      .where(
        and(
          eq(userOrganizationRoles.userId, userId),
          eq(userOrganizationRoles.organizationId, organizationId)
        )
      );
  }

  async removeTeamMember(userId: string, organizationId: number): Promise<void> {
    await db
      .delete(userOrganizationRoles)
      .where(
        and(
          eq(userOrganizationRoles.userId, userId),
          eq(userOrganizationRoles.organizationId, organizationId)
        )
      );
  }

  // Recurring transaction operations
  async getRecurringTransactions(organizationId: number): Promise<RecurringTransaction[]> {
    return await db
      .select()
      .from(recurringTransactions)
      .where(eq(recurringTransactions.organizationId, organizationId))
      .orderBy(desc(recurringTransactions.createdAt));
  }

  async getRecurringTransaction(id: number): Promise<RecurringTransaction | undefined> {
    const [transaction] = await db
      .select()
      .from(recurringTransactions)
      .where(eq(recurringTransactions.id, id));
    return transaction;
  }

  async createRecurringTransaction(transaction: InsertRecurringTransaction): Promise<RecurringTransaction> {
    const [newTransaction] = await db
      .insert(recurringTransactions)
      .values(transaction)
      .returning();
    return newTransaction;
  }

  async updateRecurringTransaction(id: number, updates: Partial<InsertRecurringTransaction>): Promise<RecurringTransaction> {
    const [updated] = await db
      .update(recurringTransactions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(recurringTransactions.id, id))
      .returning();
    return updated;
  }

  async deleteRecurringTransaction(id: number): Promise<void> {
    await db
      .delete(recurringTransactions)
      .where(eq(recurringTransactions.id, id));
  }

  async updateRecurringTransactionLastGenerated(id: number, date: Date): Promise<void> {
    await db
      .update(recurringTransactions)
      .set({ lastGeneratedDate: date })
      .where(eq(recurringTransactions.id, id));
  }

  // Transaction attachment operations
  async getTransactionAttachments(transactionId: number): Promise<TransactionAttachment[]> {
    return await db
      .select()
      .from(transactionAttachments)
      .where(eq(transactionAttachments.transactionId, transactionId))
      .orderBy(desc(transactionAttachments.createdAt));
  }

  async createTransactionAttachment(attachment: InsertTransactionAttachment): Promise<TransactionAttachment> {
    const [newAttachment] = await db
      .insert(transactionAttachments)
      .values(attachment)
      .returning();
    return newAttachment;
  }

  async deleteTransactionAttachment(id: number): Promise<void> {
    await db
      .delete(transactionAttachments)
      .where(eq(transactionAttachments.id, id));
  }
}

export const storage = new DatabaseStorage();
