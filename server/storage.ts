// Referenced from javascript_database and javascript_log_in_with_replit blueprints
import {
  users,
  organizations,
  userOrganizationRoles,
  categories,
  vendors,
  clients,
  transactions,
  grants,
  budgets,
  budgetItems,
  plaidItems,
  plaidAccounts,
  categorizationHistory,
  invitations,
  currencies,
  type User,
  type UpsertUser,
  type Organization,
  type InsertOrganization,
  type UserOrganizationRole,
  type InsertUserOrganizationRole,
  type Category,
  type InsertCategory,
  type Vendor,
  type InsertVendor,
  type Client,
  type InsertClient,
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
  type Currency,
  type InsertCurrency,
  recurringTransactions,
  type RecurringTransaction,
  type InsertRecurringTransaction,
  transactionAttachments,
  type TransactionAttachment,
  type InsertTransactionAttachment,
  invoices,
  invoiceLineItems,
  bills,
  billLineItems,
  type Invoice,
  type InsertInvoice,
  type InvoiceLineItem,
  type InsertInvoiceLineItem,
  type Bill,
  type InsertBill,
  type BillLineItem,
  type InsertBillLineItem,
  expenseApprovals,
  type ExpenseApproval,
  type InsertExpenseApproval,
  cashFlowScenarios,
  cashFlowProjections,
  type CashFlowScenario,
  type InsertCashFlowScenario,
  type CashFlowProjection,
  type InsertCashFlowProjection,
  taxCategories,
  taxReports,
  taxForm1099s,
  type TaxCategory,
  type InsertTaxCategory,
  type TaxReport,
  type InsertTaxReport,
  type TaxForm1099,
  type InsertTaxForm1099,
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
  updateOrganization(id: number, updates: Partial<InsertOrganization>): Promise<Organization>;

  // User organization role operations
  getUserRole(userId: string, organizationId: number): Promise<UserOrganizationRole | undefined>;
  createUserRole(role: InsertUserOrganizationRole): Promise<UserOrganizationRole>;

  // Category operations
  getCategories(organizationId: number): Promise<Category[]>;
  getCategory(id: number): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: number, updates: Partial<InsertCategory>): Promise<Category>;
  deleteCategory(id: number): Promise<void>;

  // Vendor operations
  getVendors(organizationId: number): Promise<Vendor[]>;
  getVendor(id: number): Promise<Vendor | undefined>;
  createVendor(vendor: InsertVendor): Promise<Vendor>;
  updateVendor(id: number, updates: Partial<InsertVendor>): Promise<Vendor>;
  deleteVendor(id: number): Promise<void>;

  // Client operations
  getClients(organizationId: number): Promise<Client[]>;
  getClient(id: number): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: number, updates: Partial<InsertClient>): Promise<Client>;
  deleteClient(id: number): Promise<void>;

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
  getTransactionAttachment(id: number): Promise<TransactionAttachment | undefined>;
  getTransactionAttachments(transactionId: number): Promise<TransactionAttachment[]>;
  createTransactionAttachment(attachment: InsertTransactionAttachment): Promise<TransactionAttachment>;
  deleteTransactionAttachment(id: number): Promise<void>;

  // Invoice operations
  getInvoices(organizationId: number): Promise<Array<Invoice & { clientName: string | null }>>;
  getInvoice(id: number): Promise<Invoice | undefined>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: number, updates: Partial<InsertInvoice>): Promise<Invoice>;
  deleteInvoice(id: number): Promise<void>;
  getInvoiceLineItems(invoiceId: number): Promise<InvoiceLineItem[]>;
  createInvoiceLineItem(item: InsertInvoiceLineItem): Promise<InvoiceLineItem>;
  updateInvoiceLineItem(id: number, updates: Partial<InsertInvoiceLineItem>): Promise<InvoiceLineItem>;
  deleteInvoiceLineItem(id: number): Promise<void>;

  // Bill operations
  getBills(organizationId: number): Promise<Array<Bill & { vendorName: string | null }>>;
  getBill(id: number): Promise<Bill | undefined>;
  createBill(bill: InsertBill): Promise<Bill>;
  updateBill(id: number, updates: Partial<InsertBill>): Promise<Bill>;
  deleteBill(id: number): Promise<void>;
  getBillLineItems(billId: number): Promise<BillLineItem[]>;
  createBillLineItem(item: InsertBillLineItem): Promise<BillLineItem>;
  updateBillLineItem(id: number, updates: Partial<InsertBillLineItem>): Promise<BillLineItem>;
  deleteBillLineItem(id: number): Promise<void>;

  // Expense approval operations
  getExpenseApprovals(organizationId: number): Promise<Array<ExpenseApproval & { requestedByName: string; categoryName: string | null; vendorName: string | null }>>;
  getExpenseApproval(id: number): Promise<ExpenseApproval | undefined>;
  createExpenseApproval(approval: InsertExpenseApproval): Promise<ExpenseApproval>;
  updateExpenseApproval(id: number, updates: Partial<InsertExpenseApproval>): Promise<ExpenseApproval>;
  deleteExpenseApproval(id: number): Promise<void>;
  approveExpenseApproval(id: number, reviewerId: string, notes?: string): Promise<ExpenseApproval>;
  rejectExpenseApproval(id: number, reviewerId: string, notes?: string): Promise<ExpenseApproval>;

  // Cash flow forecasting operations
  getCashFlowScenarios(organizationId: number): Promise<CashFlowScenario[]>;
  getCashFlowScenario(id: number): Promise<CashFlowScenario | undefined>;
  createCashFlowScenario(scenario: InsertCashFlowScenario): Promise<CashFlowScenario>;
  updateCashFlowScenario(id: number, updates: Partial<InsertCashFlowScenario>): Promise<CashFlowScenario>;
  deleteCashFlowScenario(id: number): Promise<void>;
  getCashFlowProjections(scenarioId: number): Promise<CashFlowProjection[]>;
  createCashFlowProjection(projection: InsertCashFlowProjection): Promise<CashFlowProjection>;
  updateCashFlowProjection(id: number, updates: Partial<InsertCashFlowProjection>): Promise<CashFlowProjection>;
  deleteCashFlowProjection(id: number): Promise<void>;
  generateCashFlowProjections(scenarioId: number): Promise<CashFlowProjection[]>;

  // Tax reporting operations
  getTaxCategories(organizationId: number): Promise<TaxCategory[]>;
  getTaxCategory(id: number): Promise<TaxCategory | undefined>;
  createTaxCategory(category: InsertTaxCategory): Promise<TaxCategory>;
  updateTaxCategory(id: number, updates: Partial<InsertTaxCategory>): Promise<TaxCategory>;
  deleteTaxCategory(id: number): Promise<void>;
  getTaxReports(organizationId: number, taxYear?: number): Promise<TaxReport[]>;
  getTaxReport(id: number): Promise<TaxReport | undefined>;
  createTaxReport(report: InsertTaxReport): Promise<TaxReport>;
  deleteTaxReport(id: number): Promise<void>;
  getTaxForm1099s(organizationId: number, taxYear?: number): Promise<Array<TaxForm1099 & { vendorName: string }>>;
  getTaxForm1099(id: number): Promise<TaxForm1099 | undefined>;
  createTaxForm1099(form: InsertTaxForm1099): Promise<TaxForm1099>;
  updateTaxForm1099(id: number, updates: Partial<InsertTaxForm1099>): Promise<TaxForm1099>;
  deleteTaxForm1099(id: number): Promise<void>;
  generateYearEndTaxReport(organizationId: number, taxYear: number): Promise<TaxReport>;

  // Currency operations
  getCurrencies(): Promise<Currency[]>;
  getCurrency(code: string): Promise<Currency | undefined>;
  updateCurrencyExchangeRate(code: string, exchangeRate: string): Promise<Currency>;
  updateOrganizationDefaultCurrency(organizationId: number, currencyCode: string): Promise<Organization>;
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

  async updateOrganization(id: number, updates: Partial<InsertOrganization>): Promise<Organization> {
    const [updated] = await db
      .update(organizations)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(organizations.id, id))
      .returning();
    return updated;
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

  // Vendor operations
  async getVendors(organizationId: number): Promise<Vendor[]> {
    return await db
      .select()
      .from(vendors)
      .where(eq(vendors.organizationId, organizationId))
      .orderBy(vendors.name);
  }

  async getVendor(id: number): Promise<Vendor | undefined> {
    const [vendor] = await db
      .select()
      .from(vendors)
      .where(eq(vendors.id, id));
    return vendor;
  }

  async createVendor(vendorData: InsertVendor): Promise<Vendor> {
    const [vendor] = await db
      .insert(vendors)
      .values(vendorData)
      .returning();
    return vendor;
  }

  async updateVendor(id: number, updates: Partial<InsertVendor>): Promise<Vendor> {
    const [vendor] = await db
      .update(vendors)
      .set(updates)
      .where(eq(vendors.id, id))
      .returning();
    return vendor;
  }

  async deleteVendor(id: number): Promise<void> {
    await db.delete(vendors).where(eq(vendors.id, id));
  }

  // Client operations
  async getClients(organizationId: number): Promise<Client[]> {
    return await db
      .select()
      .from(clients)
      .where(eq(clients.organizationId, organizationId))
      .orderBy(clients.name);
  }

  async getClient(id: number): Promise<Client | undefined> {
    const [client] = await db
      .select()
      .from(clients)
      .where(eq(clients.id, id));
    return client;
  }

  async createClient(clientData: InsertClient): Promise<Client> {
    const [client] = await db
      .insert(clients)
      .values(clientData)
      .returning();
    return client;
  }

  async updateClient(id: number, updates: Partial<InsertClient>): Promise<Client> {
    const [client] = await db
      .update(clients)
      .set(updates)
      .where(eq(clients.id, id))
      .returning();
    return client;
  }

  async deleteClient(id: number): Promise<void> {
    await db.delete(clients).where(eq(clients.id, id));
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
    // Ensure we include the entire end date by setting time to end of day
    const endOfDay = new Date(endDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    return await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.organizationId, organizationId),
          gte(transactions.date, startDate),
          lte(transactions.date, endOfDay)
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
    // Ensure we include the entire end date by setting time to end of day
    const endOfDay = new Date(endDate);
    endOfDay.setHours(23, 59, 59, 999);
    
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
          lte(transactions.date, endOfDay)
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
          lte(transactions.date, endOfDay)
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
          lte(transactions.date, endOfDay)
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
          lte(transactions.date, endOfDay)
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
  async getTransactionAttachment(id: number): Promise<TransactionAttachment | undefined> {
    const [attachment] = await db
      .select()
      .from(transactionAttachments)
      .where(eq(transactionAttachments.id, id));
    return attachment;
  }

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

  // Invoice operations
  async getInvoices(organizationId: number): Promise<Array<Invoice & { clientName: string | null }>> {
    const results = await db
      .select({
        id: invoices.id,
        organizationId: invoices.organizationId,
        clientId: invoices.clientId,
        invoiceNumber: invoices.invoiceNumber,
        issueDate: invoices.issueDate,
        dueDate: invoices.dueDate,
        status: invoices.status,
        subtotal: invoices.subtotal,
        taxAmount: invoices.taxAmount,
        totalAmount: invoices.totalAmount,
        notes: invoices.notes,
        transactionId: invoices.transactionId,
        createdBy: invoices.createdBy,
        createdAt: invoices.createdAt,
        updatedAt: invoices.updatedAt,
        clientName: clients.name,
      })
      .from(invoices)
      .leftJoin(clients, eq(invoices.clientId, clients.id))
      .where(eq(invoices.organizationId, organizationId))
      .orderBy(desc(invoices.issueDate));
    
    return results;
  }

  async getInvoice(id: number): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
    return invoice;
  }

  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    const [newInvoice] = await db
      .insert(invoices)
      .values(invoice)
      .returning();
    return newInvoice;
  }

  async updateInvoice(id: number, updates: Partial<InsertInvoice>): Promise<Invoice> {
    const [updated] = await db
      .update(invoices)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(invoices.id, id))
      .returning();
    return updated;
  }

  async deleteInvoice(id: number): Promise<void> {
    await db.delete(invoices).where(eq(invoices.id, id));
  }

  async getInvoiceLineItems(invoiceId: number): Promise<InvoiceLineItem[]> {
    const items = await db
      .select()
      .from(invoiceLineItems)
      .where(eq(invoiceLineItems.invoiceId, invoiceId));
    return items;
  }

  async createInvoiceLineItem(item: InsertInvoiceLineItem): Promise<InvoiceLineItem> {
    const [newItem] = await db
      .insert(invoiceLineItems)
      .values(item)
      .returning();
    return newItem;
  }

  async updateInvoiceLineItem(id: number, updates: Partial<InsertInvoiceLineItem>): Promise<InvoiceLineItem> {
    const [updated] = await db
      .update(invoiceLineItems)
      .set(updates)
      .where(eq(invoiceLineItems.id, id))
      .returning();
    return updated;
  }

  async deleteInvoiceLineItem(id: number): Promise<void> {
    await db.delete(invoiceLineItems).where(eq(invoiceLineItems.id, id));
  }

  // Bill operations
  async getBills(organizationId: number): Promise<Array<Bill & { vendorName: string | null }>> {
    const results = await db
      .select({
        id: bills.id,
        organizationId: bills.organizationId,
        vendorId: bills.vendorId,
        billNumber: bills.billNumber,
        issueDate: bills.issueDate,
        dueDate: bills.dueDate,
        status: bills.status,
        subtotal: bills.subtotal,
        taxAmount: bills.taxAmount,
        totalAmount: bills.totalAmount,
        notes: bills.notes,
        transactionId: bills.transactionId,
        createdBy: bills.createdBy,
        createdAt: bills.createdAt,
        updatedAt: bills.updatedAt,
        vendorName: vendors.name,
      })
      .from(bills)
      .leftJoin(vendors, eq(bills.vendorId, vendors.id))
      .where(eq(bills.organizationId, organizationId))
      .orderBy(desc(bills.issueDate));
    
    return results;
  }

  async getBill(id: number): Promise<Bill | undefined> {
    const [bill] = await db.select().from(bills).where(eq(bills.id, id));
    return bill;
  }

  async createBill(bill: InsertBill): Promise<Bill> {
    const [newBill] = await db
      .insert(bills)
      .values(bill)
      .returning();
    return newBill;
  }

  async updateBill(id: number, updates: Partial<InsertBill>): Promise<Bill> {
    const [updated] = await db
      .update(bills)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(bills.id, id))
      .returning();
    return updated;
  }

  async deleteBill(id: number): Promise<void> {
    await db.delete(bills).where(eq(bills.id, id));
  }

  async getBillLineItems(billId: number): Promise<BillLineItem[]> {
    const items = await db
      .select()
      .from(billLineItems)
      .where(eq(billLineItems.billId, billId));
    return items;
  }

  async createBillLineItem(item: InsertBillLineItem): Promise<BillLineItem> {
    const [newItem] = await db
      .insert(billLineItems)
      .values(item)
      .returning();
    return newItem;
  }

  async updateBillLineItem(id: number, updates: Partial<InsertBillLineItem>): Promise<BillLineItem> {
    const [updated] = await db
      .update(billLineItems)
      .set(updates)
      .where(eq(billLineItems.id, id))
      .returning();
    return updated;
  }

  async deleteBillLineItem(id: number): Promise<void> {
    await db.delete(billLineItems).where(eq(billLineItems.id, id));
  }

  // ============================================
  // EXPENSE APPROVAL OPERATIONS
  // ============================================

  async getExpenseApprovals(organizationId: number): Promise<Array<ExpenseApproval & { requestedByName: string; categoryName: string | null; vendorName: string | null }>> {
    const results = await db
      .select({
        id: expenseApprovals.id,
        organizationId: expenseApprovals.organizationId,
        description: expenseApprovals.description,
        amount: expenseApprovals.amount,
        categoryId: expenseApprovals.categoryId,
        vendorId: expenseApprovals.vendorId,
        requestDate: expenseApprovals.requestDate,
        requestedBy: expenseApprovals.requestedBy,
        status: expenseApprovals.status,
        reviewedBy: expenseApprovals.reviewedBy,
        reviewedAt: expenseApprovals.reviewedAt,
        reviewNotes: expenseApprovals.reviewNotes,
        receiptUrl: expenseApprovals.receiptUrl,
        notes: expenseApprovals.notes,
        createdAt: expenseApprovals.createdAt,
        updatedAt: expenseApprovals.updatedAt,
        requestedByName: sql<string>`COALESCE(${users.firstName} || ' ' || ${users.lastName}, ${users.email})`,
        categoryName: categories.name,
        vendorName: vendors.name,
      })
      .from(expenseApprovals)
      .leftJoin(users, eq(expenseApprovals.requestedBy, users.id))
      .leftJoin(categories, eq(expenseApprovals.categoryId, categories.id))
      .leftJoin(vendors, eq(expenseApprovals.vendorId, vendors.id))
      .where(eq(expenseApprovals.organizationId, organizationId))
      .orderBy(desc(expenseApprovals.requestDate));
    
    return results;
  }

  async getExpenseApproval(id: number): Promise<ExpenseApproval | undefined> {
    const [approval] = await db.select().from(expenseApprovals).where(eq(expenseApprovals.id, id));
    return approval;
  }

  async createExpenseApproval(approval: InsertExpenseApproval): Promise<ExpenseApproval> {
    const [newApproval] = await db
      .insert(expenseApprovals)
      .values(approval)
      .returning();
    return newApproval;
  }

  async updateExpenseApproval(id: number, updates: Partial<InsertExpenseApproval>): Promise<ExpenseApproval> {
    const [updated] = await db
      .update(expenseApprovals)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(expenseApprovals.id, id))
      .returning();
    return updated;
  }

  async deleteExpenseApproval(id: number): Promise<void> {
    await db.delete(expenseApprovals).where(eq(expenseApprovals.id, id));
  }

  async approveExpenseApproval(id: number, reviewerId: string, notes?: string): Promise<ExpenseApproval> {
    const [updated] = await db
      .update(expenseApprovals)
      .set({
        status: 'approved',
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
        reviewNotes: notes,
        updatedAt: new Date(),
      })
      .where(eq(expenseApprovals.id, id))
      .returning();
    return updated;
  }

  async rejectExpenseApproval(id: number, reviewerId: string, notes?: string): Promise<ExpenseApproval> {
    const [updated] = await db
      .update(expenseApprovals)
      .set({
        status: 'rejected',
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
        reviewNotes: notes,
        updatedAt: new Date(),
      })
      .where(eq(expenseApprovals.id, id))
      .returning();
    return updated;
  }

  // ============================================
  // CASH FLOW FORECASTING OPERATIONS
  // ============================================

  async getCashFlowScenarios(organizationId: number): Promise<CashFlowScenario[]> {
    const scenarios = await db
      .select()
      .from(cashFlowScenarios)
      .where(eq(cashFlowScenarios.organizationId, organizationId))
      .orderBy(desc(cashFlowScenarios.createdAt));
    return scenarios;
  }

  async getCashFlowScenario(id: number): Promise<CashFlowScenario | undefined> {
    const [scenario] = await db.select().from(cashFlowScenarios).where(eq(cashFlowScenarios.id, id));
    return scenario;
  }

  async createCashFlowScenario(scenario: InsertCashFlowScenario): Promise<CashFlowScenario> {
    const [newScenario] = await db
      .insert(cashFlowScenarios)
      .values(scenario)
      .returning();
    return newScenario;
  }

  async updateCashFlowScenario(id: number, updates: Partial<InsertCashFlowScenario>): Promise<CashFlowScenario> {
    const [updated] = await db
      .update(cashFlowScenarios)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(cashFlowScenarios.id, id))
      .returning();
    return updated;
  }

  async deleteCashFlowScenario(id: number): Promise<void> {
    await db.delete(cashFlowScenarios).where(eq(cashFlowScenarios.id, id));
  }

  async getCashFlowProjections(scenarioId: number): Promise<CashFlowProjection[]> {
    const projections = await db
      .select()
      .from(cashFlowProjections)
      .where(eq(cashFlowProjections.scenarioId, scenarioId))
      .orderBy(cashFlowProjections.month);
    return projections;
  }

  async createCashFlowProjection(projection: InsertCashFlowProjection): Promise<CashFlowProjection> {
    const [newProjection] = await db
      .insert(cashFlowProjections)
      .values(projection)
      .returning();
    return newProjection;
  }

  async updateCashFlowProjection(id: number, updates: Partial<InsertCashFlowProjection>): Promise<CashFlowProjection> {
    const [updated] = await db
      .update(cashFlowProjections)
      .set(updates)
      .where(eq(cashFlowProjections.id, id))
      .returning();
    return updated;
  }

  async deleteCashFlowProjection(id: number): Promise<void> {
    await db.delete(cashFlowProjections).where(eq(cashFlowProjections.id, id));
  }

  async generateCashFlowProjections(scenarioId: number): Promise<CashFlowProjection[]> {
    const scenario = await this.getCashFlowScenario(scenarioId);
    if (!scenario) {
      throw new Error('Scenario not found');
    }

    // Get historical transactions for baseline
    const startDate = new Date(scenario.startDate);
    const endDate = new Date(scenario.endDate);
    const historicalStart = new Date(startDate);
    historicalStart.setMonth(historicalStart.getMonth() - 6); // Get 6 months of historical data

    const historicalTransactions = await this.getTransactionsByDateRange(
      scenario.organizationId,
      historicalStart,
      startDate
    );

    // Calculate average monthly income and expenses
    const monthCount = 6;
    let totalIncome = 0;
    let totalExpenses = 0;

    historicalTransactions.forEach(tx => {
      const amount = parseFloat(tx.amount);
      if (tx.type === 'income') {
        totalIncome += amount;
      } else {
        totalExpenses += amount;
      }
    });

    const avgMonthlyIncome = totalIncome / monthCount;
    const avgMonthlyExpenses = totalExpenses / monthCount;

    // Get recurring transactions to add to projections
    const recurringTxs = await db
      .select()
      .from(recurringTransactions)
      .where(
        and(
          eq(recurringTransactions.organizationId, scenario.organizationId),
          eq(recurringTransactions.isActive, 1)
        )
      );

    // Generate monthly projections
    const projections: CashFlowProjection[] = [];
    let runningBalance = 0;

    const currentMonth = new Date(startDate);
    while (currentMonth <= endDate) {
      const incomeGrowthMultiplier = 1 + (parseFloat(scenario.incomeGrowthRate || '0') / 100);
      const expenseGrowthMultiplier = 1 + (parseFloat(scenario.expenseGrowthRate || '0') / 100);

      // Calculate projected income and expenses with growth
      const monthsFromStart = Math.floor(
        (currentMonth.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
      );
      
      let projectedIncome = avgMonthlyIncome * Math.pow(incomeGrowthMultiplier, monthsFromStart);
      let projectedExpenses = avgMonthlyExpenses * Math.pow(expenseGrowthMultiplier, monthsFromStart);

      // Add recurring transactions for this month
      recurringTxs.forEach(rtx => {
        const amount = parseFloat(rtx.amount);
        if (rtx.type === 'income') {
          projectedIncome += amount;
        } else {
          projectedExpenses += amount;
        }
      });

      runningBalance += projectedIncome - projectedExpenses;

      const [projection] = await db
        .insert(cashFlowProjections)
        .values({
          scenarioId,
          month: new Date(currentMonth),
          projectedIncome: projectedIncome.toFixed(2),
          projectedExpenses: projectedExpenses.toFixed(2),
          projectedBalance: runningBalance.toFixed(2),
        })
        .returning();

      projections.push(projection);

      // Move to next month
      currentMonth.setMonth(currentMonth.getMonth() + 1);
    }

    return projections;
  }

  // ============================================
  // TAX REPORTING OPERATIONS
  // ============================================

  async getTaxCategories(organizationId: number): Promise<TaxCategory[]> {
    const categories = await db
      .select()
      .from(taxCategories)
      .where(eq(taxCategories.organizationId, organizationId))
      .orderBy(taxCategories.name);
    return categories;
  }

  async getTaxCategory(id: number): Promise<TaxCategory | undefined> {
    const [category] = await db.select().from(taxCategories).where(eq(taxCategories.id, id));
    return category;
  }

  async createTaxCategory(category: InsertTaxCategory): Promise<TaxCategory> {
    const [newCategory] = await db
      .insert(taxCategories)
      .values(category)
      .returning();
    return newCategory;
  }

  async updateTaxCategory(id: number, updates: Partial<InsertTaxCategory>): Promise<TaxCategory> {
    const [updated] = await db
      .update(taxCategories)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(taxCategories.id, id))
      .returning();
    return updated;
  }

  async deleteTaxCategory(id: number): Promise<void> {
    await db.delete(taxCategories).where(eq(taxCategories.id, id));
  }

  async getTaxReports(organizationId: number, taxYear?: number): Promise<TaxReport[]> {
    let query = db
      .select()
      .from(taxReports)
      .where(eq(taxReports.organizationId, organizationId));

    if (taxYear) {
      query = query.where(eq(taxReports.taxYear, taxYear));
    }

    const reports = await query.orderBy(desc(taxReports.taxYear));
    return reports;
  }

  async getTaxReport(id: number): Promise<TaxReport | undefined> {
    const [report] = await db.select().from(taxReports).where(eq(taxReports.id, id));
    return report;
  }

  async createTaxReport(report: InsertTaxReport): Promise<TaxReport> {
    const [newReport] = await db
      .insert(taxReports)
      .values(report)
      .returning();
    return newReport;
  }

  async deleteTaxReport(id: number): Promise<void> {
    await db.delete(taxReports).where(eq(taxReports.id, id));
  }

  async getTaxForm1099s(organizationId: number, taxYear?: number): Promise<Array<TaxForm1099 & { vendorName: string }>> {
    let query = db
      .select({
        id: taxForm1099s.id,
        organizationId: taxForm1099s.organizationId,
        taxYear: taxForm1099s.taxYear,
        vendorId: taxForm1099s.vendorId,
        formType: taxForm1099s.formType,
        totalAmount: taxForm1099s.totalAmount,
        recipientName: taxForm1099s.recipientName,
        recipientTin: taxForm1099s.recipientTin,
        recipientAddress: taxForm1099s.recipientAddress,
        isFiled: taxForm1099s.isFiled,
        filedDate: taxForm1099s.filedDate,
        notes: taxForm1099s.notes,
        createdBy: taxForm1099s.createdBy,
        createdAt: taxForm1099s.createdAt,
        updatedAt: taxForm1099s.updatedAt,
        vendorName: vendors.name,
      })
      .from(taxForm1099s)
      .leftJoin(vendors, eq(taxForm1099s.vendorId, vendors.id))
      .where(eq(taxForm1099s.organizationId, organizationId));

    if (taxYear) {
      query = query.where(eq(taxForm1099s.taxYear, taxYear));
    }

    const forms = await query.orderBy(desc(taxForm1099s.taxYear));
    return forms;
  }

  async getTaxForm1099(id: number): Promise<TaxForm1099 | undefined> {
    const [form] = await db.select().from(taxForm1099s).where(eq(taxForm1099s.id, id));
    return form;
  }

  async createTaxForm1099(form: InsertTaxForm1099): Promise<TaxForm1099> {
    const [newForm] = await db
      .insert(taxForm1099s)
      .values(form)
      .returning();
    return newForm;
  }

  async updateTaxForm1099(id: number, updates: Partial<InsertTaxForm1099>): Promise<TaxForm1099> {
    const [updated] = await db
      .update(taxForm1099s)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(taxForm1099s.id, id))
      .returning();
    return updated;
  }

  async deleteTaxForm1099(id: number): Promise<void> {
    await db.delete(taxForm1099s).where(eq(taxForm1099s.id, id));
  }

  async generateYearEndTaxReport(organizationId: number, taxYear: number): Promise<TaxReport> {
    // Get all transactions for the tax year
    const startDate = new Date(taxYear, 0, 1);
    const endDate = new Date(taxYear, 11, 31, 23, 59, 59, 999);

    const yearTransactions = await this.getTransactionsByDateRange(
      organizationId,
      startDate,
      endDate
    );

    // Calculate totals
    let totalIncome = 0;
    let totalExpenses = 0;
    let totalDeductions = 0;

    const categoryTotals: Record<string, number> = {};

    yearTransactions.forEach(tx => {
      const amount = parseFloat(tx.amount);
      if (tx.type === 'income') {
        totalIncome += amount;
      } else {
        totalExpenses += amount;
        // TODO: Check if expense is tax deductible based on category
        totalDeductions += amount; // For now, all expenses are deductible
      }

      // Track by category
      if (tx.categoryId) {
        categoryTotals[tx.categoryId] = (categoryTotals[tx.categoryId] || 0) + amount;
      }
    });

    const netIncome = totalIncome - totalExpenses;

    // Get organization to determine form type
    const org = await this.getOrganization(organizationId);
    const formType = org?.type === 'nonprofit' ? '990' : '1040_schedule_c';

    // Create the tax report
    const [report] = await db
      .insert(taxReports)
      .values({
        organizationId,
        taxYear,
        formType,
        totalIncome: totalIncome.toFixed(2),
        totalExpenses: totalExpenses.toFixed(2),
        totalDeductions: totalDeductions.toFixed(2),
        netIncome: netIncome.toFixed(2),
        reportData: {
          categoryTotals,
          transactionCount: yearTransactions.length,
        },
        generatedBy: 'system', // TODO: Pass in actual user ID
      })
      .returning();

    return report;
  }

  // Currency operations
  async getCurrencies(): Promise<Currency[]> {
    return await db.select().from(currencies).where(eq(currencies.isActive, 1)).orderBy(currencies.code);
  }

  async getCurrency(code: string): Promise<Currency | undefined> {
    const [currency] = await db.select().from(currencies).where(eq(currencies.code, code));
    return currency;
  }

  async updateCurrencyExchangeRate(code: string, exchangeRate: string): Promise<Currency> {
    const [currency] = await db
      .update(currencies)
      .set({ exchangeRateToUSD: exchangeRate, updatedAt: new Date() })
      .where(eq(currencies.code, code))
      .returning();
    return currency;
  }

  async updateOrganizationDefaultCurrency(organizationId: number, currencyCode: string): Promise<Organization> {
    const [organization] = await db
      .update(organizations)
      .set({ defaultCurrency: currencyCode, updatedAt: new Date() })
      .where(eq(organizations.id, organizationId))
      .returning();
    return organization;
  }
}

export const storage = new DatabaseStorage();
