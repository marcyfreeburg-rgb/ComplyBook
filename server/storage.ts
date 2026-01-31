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
  donors,
  type Donor,
  type InsertDonor,
  donorLetters,
  type DonorLetter,
  type InsertDonorLetter,
  forms,
  formQuestions,
  formResponses,
  type Form,
  type InsertForm,
  type FormQuestion,
  type InsertFormQuestion,
  type FormResponse,
  type InsertFormResponse,
  type Transaction,
  type InsertTransaction,
  type Grant,
  type InsertGrant,
  type Budget,
  type InsertBudget,
  type BudgetItem,
  type InsertBudgetItem,
  budgetIncomeItems,
  type BudgetIncomeItem,
  type InsertBudgetIncomeItem,
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
  customReports,
  type CustomReport,
  type InsertCustomReport,
  auditLogs,
  type AuditLog,
  type InsertAuditLog,
  notifications,
  type Notification,
  type InsertNotification,
  teams,
  type Team,
  type InsertTeam,
  employees,
  type Employee,
  type InsertEmployee,
  deductions,
  type Deduction,
  type InsertDeduction,
  payrollRuns,
  type PayrollRun,
  type InsertPayrollRun,
  payrollItems,
  type PayrollItem,
  type InsertPayrollItem,
  payrollItemDeductions,
  type PayrollItemDeduction,
  type InsertPayrollItemDeduction,
  // Nonprofit-specific types
  funds,
  type Fund,
  type InsertFund,
  programs,
  type Program,
  type InsertProgram,
  pledges,
  type Pledge,
  type InsertPledge,
  pledgePayments,
  type PledgePayment,
  type InsertPledgePayment,
  // Government Contracts (For-profit)
  contracts,
  type Contract,
  type InsertContract,
  contractMilestones,
  type ContractMilestone,
  type InsertContractMilestone,
  projects,
  type Project,
  type InsertProject,
  timeEntries,
  type TimeEntry,
  type InsertTimeEntry,
  indirectCostRates,
  type IndirectCostRate,
  type InsertIndirectCostRate,
  projectCosts,
  type ProjectCost,
  type InsertProjectCost,
  projectBudgetBreakdowns,
  projectRevenueLedger,
  // Government Grants (Nonprofit)
  timeEffortReports,
  type TimeEffortReport,
  type InsertTimeEffortReport,
  costAllowabilityChecks,
  type CostAllowabilityCheck,
  type InsertCostAllowabilityCheck,
  subAwards,
  type SubAward,
  type InsertSubAward,
  federalFinancialReports,
  type FederalFinancialReport,
  type InsertFederalFinancialReport,
  auditPrepItems,
  type AuditPrepItem,
  type InsertAuditPrepItem,
  // Security types
  securityEventLog,
  type SecurityEvent,
  type InsertSecurityEvent,
  failedLoginAttempts,
  type FailedLoginAttempt,
  type InsertFailedLoginAttempt,
  vulnerabilityScans,
  type VulnerabilityScan,
  type InsertVulnerabilityScan,
  // Bank Reconciliation types
  bankReconciliations,
  type BankReconciliation,
  type InsertBankReconciliation,
  bankStatementEntries,
  type BankStatementEntry,
  type InsertBankStatementEntry,
  reconciliationMatches,
  type ReconciliationMatch,
  type InsertReconciliationMatch,
  // Bill Payment Automation types
  autoPayRules,
  type AutoPayRule,
  type InsertAutoPayRule,
  scheduledPayments,
  type ScheduledPayment,
  type InsertScheduledPayment,
  billPayments,
  type BillPayment,
  type InsertBillPayment,
  vendorPaymentDetails,
  type VendorPaymentDetails,
  type InsertVendorPaymentDetails,
  finchConnections,
  type FinchConnection,
  type InsertFinchConnection,
  // Donor Portal Access Tokens
  donorAccessTokens,
  type DonorAccessToken,
  type InsertDonorAccessToken,
  // For-profit: Proposals, Subcontractors, Change Orders
  proposals,
  type Proposal,
  type InsertProposal,
  subcontractors,
  type Subcontractor,
  type InsertSubcontractor,
  changeOrders,
  type ChangeOrder,
  type InsertChangeOrder,
  // Dismissed recurring patterns
  dismissedPatterns,
  type DismissedPattern,
  type InsertDismissedPattern,
  // Mileage and Per Diem
  mileageRates,
  type MileageRate,
  type InsertMileageRate,
  mileageExpenses,
  type MileageExpense,
  type InsertMileageExpense,
  perDiemRates,
  type PerDiemRate,
  type InsertPerDiemRate,
  perDiemExpenses,
  type PerDiemExpense,
  type InsertPerDiemExpense,
  // Budget Alerts
  budgetAlerts,
  type BudgetAlert,
  type InsertBudgetAlert,
  // Reconciliation Audit Logs and Alerts
  reconciliationAuditLogs,
  type ReconciliationAuditLog,
  type InsertReconciliationAuditLog,
  reconciliationAlerts,
  type ReconciliationAlert,
  type InsertReconciliationAlert,
  // Documents
  documents,
  type Document,
  type InsertDocument,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, lt, sql, desc, inArray, or, isNull, isNotNull } from "drizzle-orm";
import memoize from "memoizee";
import { encryptField, decryptField } from './encryption';
import { computeAuditLogHash, verifyAuditLogChain as verifyChain, repairAuditLogChain as repairChain } from './auditChain';

// Interface for storage operations
export interface IStorage {
  // User operations (IMPORTANT: mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByStripeSubscriptionId(subscriptionId: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  upsertLocalUser(userData: { id: string; email: string; passwordHash: string; firstName?: string; lastName?: string; role?: string }): Promise<User>;
  updateUserPassword(userId: string, passwordHash: string): Promise<User>;
  updateUser(userId: string, updates: Partial<{
    stripeSubscriptionId: string | null;
    subscriptionTier: 'free' | 'core' | 'professional' | 'growth' | 'enterprise';
    subscriptionStatus: string | null;
    subscriptionCurrentPeriodEnd: Date | null;
    billingInterval: string | null;
  }>): Promise<User>;
  
  // MFA enforcement (NIST 800-53 IA-2(1), IA-2(2))
  setMfaRequired(userId: string, required: boolean, gracePeriodDays?: number): Promise<User>;
  checkMfaGracePeriod(userId: string): Promise<{ expired: boolean; daysRemaining: number | null }>;
  updateMfaNotification(userId: string): Promise<User>;
  getUsersRequiringMfa(): Promise<User[]>;
  
  // MFA TOTP implementation (NIST 800-53 IA-2(1))
  setupMfaSecret(userId: string, encryptedSecret: string): Promise<User>;
  enableMfa(userId: string, hashedBackupCodes: string[]): Promise<User>;
  disableMfa(userId: string): Promise<User>;
  getMfaSecret(userId: string): Promise<string | null>;
  getMfaBackupCodes(userId: string): Promise<string[] | null>;
  updateMfaBackupCodes(userId: string, hashedBackupCodes: string[]): Promise<User>;

  // Security event logging (NIST 800-53 AU-2, AC-7)
  logSecurityEvent(event: InsertSecurityEvent): Promise<SecurityEvent>;
  getSecurityEvents(filters?: {
    organizationId?: number;
    userId?: string;
    eventType?: string;
    startDate?: Date;
    endDate?: Date;
    severity?: string;
    limit?: number;
  }): Promise<SecurityEvent[]>;
  
  // Failed login tracking (NIST 800-53 AC-7)
  recordFailedLoginAttempt(email: string, ipAddress: string, userId?: string): Promise<void>;
  getFailedLoginAttempts(email: string, ipAddress: string, minutesAgo: number): Promise<FailedLoginAttempt[]>;
  getFailedLoginAttemptsByEmail(email: string, minutesAgo: number): Promise<FailedLoginAttempt[]>;
  lockAccount(email: string, lockoutMinutes: number): Promise<void>;
  unlockAccount(email: string): Promise<void>;
  isAccountLocked(email: string): Promise<boolean>;
  clearFailedLoginAttempts(email: string): Promise<void>;

  // Vulnerability scanning (NIST 800-53 RA-5, SI-2)
  createVulnerabilityScan(scan: InsertVulnerabilityScan): Promise<VulnerabilityScan>;
  updateVulnerabilityScan(id: number, updates: Partial<InsertVulnerabilityScan>): Promise<VulnerabilityScan>;
  getLatestVulnerabilityScan(): Promise<VulnerabilityScan | undefined>;
  getVulnerabilityScans(limit?: number): Promise<VulnerabilityScan[]>;

  // Organization operations
  getOrganizations(userId: string): Promise<Array<Organization & { userRole: string }>>;
  getOrganization(id: number): Promise<Organization | undefined>;
  createOrganization(org: InsertOrganization, userId: string): Promise<Organization>;
  updateOrganization(id: number, updates: Partial<InsertOrganization>): Promise<Organization>;
  deleteOrganization(id: number): Promise<void>;

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

  // Donor operations
  getDonors(organizationId: number): Promise<Donor[]>;
  getDonor(id: number): Promise<Donor | undefined>;
  createDonor(donor: InsertDonor): Promise<Donor>;
  updateDonor(id: number, updates: Partial<InsertDonor>): Promise<Donor>;
  deleteDonor(id: number): Promise<void>;
  getDonorDonations(donorId: number, year?: number): Promise<Array<Transaction & { donorName: string }>>;
  getDonationsByYear(organizationId: number, year: number): Promise<Array<{ donor: Donor; totalAmount: string; donations: Transaction[] }>>;

  // Donor Letter operations
  getDonorLetters(organizationId: number): Promise<Array<DonorLetter & { donorName: string }>>;
  getDonorLettersByDonorAndYear(donorId: number, year: number): Promise<DonorLetter[]>;
  getDonorLetter(id: number): Promise<DonorLetter | undefined>;
  createDonorLetter(letter: InsertDonorLetter, userId: string): Promise<DonorLetter>;
  updateDonorLetter(id: number, updates: Partial<InsertDonorLetter>): Promise<DonorLetter>;
  updateDonorLetterDelivery(id: number, delivery: { letterStatus: string; deliveryMode: string; deliveryRef: string }): Promise<DonorLetter>;
  finalizeDonorLetter(id: number, renderedHtml: string): Promise<DonorLetter>;
  deleteDonorLetter(id: number): Promise<void>;

  // Transaction operations
  getTransaction(id: number): Promise<Transaction | undefined>;
  getTransactions(organizationId: number): Promise<Transaction[]>;
  getTransactionsPaginated(organizationId: number, options: { limit: number; offset: number; search?: string; startDate?: string; endDate?: string }): Promise<{ transactions: Transaction[]; total: number; hasMore: boolean }>;
  getTransactionsByDateRange(organizationId: number, startDate: Date, endDate: Date): Promise<Transaction[]>;
  getTransactionByExternalId(organizationId: number, externalId: string): Promise<Transaction | undefined>;
  getTransactionsByExternalIds(organizationId: number, externalIds: string[]): Promise<Map<string, Transaction>>;
  findMatchingManualTransaction(organizationId: number, date: Date, amount: string, description: string, type: 'income' | 'expense'): Promise<Transaction | undefined>;
  findAnyMatchingTransaction(organizationId: number, date: Date, amount: string, description: string, type: 'income' | 'expense'): Promise<Transaction | undefined>;
  findPotentialDuplicateTransactions(organizationId: number, startDate: Date, endDate: Date): Promise<Transaction[]>;
  getCategoryExamples(organizationId: number, categoryIds: number[], examplesPerCategory: number): Promise<Map<number, string[]>>;
  getRecentTransactions(organizationId: number, limit: number): Promise<Transaction[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  updateTransaction(id: number, updates: Partial<InsertTransaction>): Promise<Transaction>;
  deleteTransaction(id: number): Promise<void>;
  
  // Transaction split operations
  splitTransaction(transactionId: number, splits: Array<{ amount: string; description?: string; categoryId?: number | null; grantId?: number | null; fundId?: number | null; programId?: number | null; functionalCategory?: 'program' | 'administrative' | 'fundraising' | null }>, userId: string): Promise<Transaction[]>;
  getTransactionSplits(parentTransactionId: number): Promise<Transaction[]>;
  unsplitTransaction(parentTransactionId: number): Promise<Transaction>;

  // Reconciliation operations
  getUnreconciledTransactions(organizationId: number, plaidAccountId?: string): Promise<Transaction[]>;
  getReconciledTransactions(organizationId: number, limit?: number, offset?: number): Promise<Transaction[]>;
  reconcileTransaction(id: number, userId: string): Promise<Transaction>;
  unreconcileTransaction(id: number): Promise<Transaction>;
  bulkReconcileTransactions(ids: number[], userId: string): Promise<number>;
  autoReconcileTransactions(organizationId: number, userId: string): Promise<{ reconciledCount: number; matchedTransactions: Array<{ transactionId: number; plaidTransactionId: string }> }>;
  
  // Bank Reconciliation Session operations
  getBankReconciliations(organizationId: number): Promise<BankReconciliation[]>;
  getBankReconciliation(id: number): Promise<BankReconciliation | undefined>;
  getLastBankReconciliation(organizationId: number, accountName?: string): Promise<BankReconciliation | undefined>;
  createBankReconciliation(reconciliation: InsertBankReconciliation): Promise<BankReconciliation>;
  updateBankReconciliation(id: number, updates: Partial<InsertBankReconciliation>): Promise<BankReconciliation>;
  deleteBankReconciliation(id: number): Promise<void>;
  
  // Bank Statement Entry operations
  getBankStatementEntry(id: number): Promise<BankStatementEntry | undefined>;
  getBankStatementEntries(reconciliationId: number): Promise<BankStatementEntry[]>;
  createBankStatementEntry(entry: InsertBankStatementEntry): Promise<BankStatementEntry>;
  bulkCreateBankStatementEntries(entries: InsertBankStatementEntry[]): Promise<BankStatementEntry[]>;
  updateBankStatementEntry(id: number, updates: Partial<InsertBankStatementEntry>): Promise<BankStatementEntry>;
  deleteBankStatementEntry(id: number): Promise<void>;
  
  // Reconciliation Match operations
  getReconciliationMatches(reconciliationId: number): Promise<ReconciliationMatch[]>;
  matchTransactionToStatementEntry(reconciliationId: number, transactionId: number, statementEntryId: number, userId: string): Promise<ReconciliationMatch>;
  unmatchTransaction(matchId: number): Promise<void>;
  bulkDeleteMatches(matchIds: number[]): Promise<number>;
  getSuggestedMatches(reconciliationId: number): Promise<Array<{
    transaction: Transaction;
    statementEntry: BankStatementEntry;
    similarityScore: number;
  }>>;
  getMatchedTransactionIds(organizationId: number): Promise<number[]>;

  // Grant operations
  getGrants(organizationId: number): Promise<Array<Grant & { totalSpent: string; totalIncome: string; remainingBalance: string }>>;
  createGrant(grant: InsertGrant): Promise<Grant>;

  // Budget operations
  getBudgets(organizationId: number): Promise<Budget[]>;
  getBudget(id: number): Promise<Budget | undefined>;
  createBudget(budget: InsertBudget): Promise<Budget>;
  updateBudget(id: number, updates: Partial<InsertBudget>): Promise<Budget>;
  deleteBudget(id: number): Promise<void>;
  getBudgetItems(budgetId: number): Promise<Array<BudgetItem & { categoryName: string }>>;
  getBudgetItem(id: number): Promise<BudgetItem | null>;
  createBudgetItem(item: InsertBudgetItem): Promise<BudgetItem>;
  updateBudgetItem(id: number, updates: Partial<InsertBudgetItem>): Promise<BudgetItem>;
  deleteBudgetItem(id: number): Promise<void>;
  
  // Budget Income Item operations
  getBudgetIncomeItems(budgetId: number): Promise<BudgetIncomeItem[]>;
  createBudgetIncomeItem(item: InsertBudgetIncomeItem): Promise<BudgetIncomeItem>;
  updateBudgetIncomeItem(id: number, updates: Partial<InsertBudgetIncomeItem>): Promise<BudgetIncomeItem>;
  deleteBudgetIncomeItem(id: number): Promise<void>;

  getBudgetVsActual(budgetId: number): Promise<Array<{
    categoryId: number;
    categoryName: string;
    budgeted: string;
    actual: string;
    difference: string;
    percentUsed: number;
  }>>;

  // Budget Alert operations
  getBudgetAlerts(budgetId: number): Promise<BudgetAlert[]>;
  getRecentBudgetAlerts(budgetId: number, alertType: string): Promise<BudgetAlert | null>;
  createBudgetAlert(alert: InsertBudgetAlert): Promise<BudgetAlert>;
  acknowledgeBudgetAlert(id: number, userId: string): Promise<BudgetAlert>;
  checkAndSendBudgetAlerts(organizationId: number): Promise<{ alertsSent: number; budgetsChecked: number }>;

  // Program-level budget operations with roll-up
  getProgramBudgetSummary(organizationId: number): Promise<Array<{
    programId: number | null;
    programName: string;
    budgetCount: number;
    totalBudgeted: string;
    totalActual: string;
    variance: string;
    percentUsed: number;
    status: 'under_budget' | 'on_track' | 'over_budget';
  }>>;
  getOrganizationBudgetRollup(organizationId: number): Promise<{
    totalBudgeted: string;
    totalActual: string;
    variance: string;
    percentUsed: number;
    programBreakdown: Array<{
      programId: number | null;
      programName: string;
      budgeted: string;
      actual: string;
      percentOfTotal: number;
    }>;
  }>;

  // Multi-year budget operations
  getMultiYearBudgetSummary(organizationId: number, years?: number[]): Promise<Array<{
    year: number;
    fiscalYear: string;
    totalBudgeted: string;
    totalActual: string;
    variance: string;
    percentUsed: number;
    budgetCount: number;
  }>>;
  getBudgetsByFiscalYear(organizationId: number, fiscalYear: string): Promise<Budget[]>;
  getRollingForecast(organizationId: number, months: number): Promise<Array<{
    month: string;
    projectedIncome: string;
    projectedExpenses: string;
    projectedBalance: string;
    isHistorical: boolean;
  }>>;

  // Enhanced cash flow operations
  generateCashFlowProjection(scenarioId: number): Promise<Array<{
    month: string;
    projectedIncome: string;
    projectedExpenses: string;
    projectedBalance: string;
    seasonalFactor: number;
    notes: string;
  }>>;
  exportCashFlowProjections(organizationId: number, scenarioId?: number, format?: 'csv' | 'json'): Promise<string>;

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

  getMonthlyTrends(organizationId: number, months?: number): Promise<Array<{
    month: string;
    income: string;
    expenses: string;
    netIncome: string;
  }>>;

  // Enhanced Analytics operations
  getYearOverYearAnalytics(organizationId: number): Promise<{
    currentYear: { income: string; expenses: string; netIncome: string };
    previousYear: { income: string; expenses: string; netIncome: string };
    change: { income: string; expenses: string; netIncome: string; incomePercent: number; expensesPercent: number; netIncomePercent: number };
    monthlyComparison: Array<{
      month: string;
      currentYearIncome: string;
      previousYearIncome: string;
      currentYearExpenses: string;
      previousYearExpenses: string;
    }>;
  }>;

  getForecastAnalytics(organizationId: number, months: number): Promise<{
    forecast: Array<{
      month: string;
      projectedIncome: string;
      projectedExpenses: string;
      projectedNetIncome: string;
      confidence: 'high' | 'medium' | 'low';
    }>;
    trendAnalysis: {
      incomeGrowthRate: number;
      expenseGrowthRate: number;
      averageMonthlyIncome: string;
      averageMonthlyExpenses: string;
    };
  }>;

  getFinancialHealthMetrics(organizationId: number): Promise<{
    burnRate: string;
    runway: number | null;
    cashReserves: string;
    quickRatio: number | null;
    profitMargin: number;
    monthlyAvgIncome: string;
    monthlyAvgExpenses: string;
    healthScore: number;
    healthStatus: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  }>;

  getSpendingInsights(organizationId: number): Promise<{
    topExpenseCategories: Array<{ categoryName: string; amount: string; percentage: number; trend: 'up' | 'down' | 'stable' }>;
    unusualSpending: Array<{ categoryName: string; currentAmount: string; averageAmount: string; percentDiff: number }>;
    recurringExpenses: Array<{ description: string; amount: string; frequency: string; nextDate: string }>;
    savingsOpportunities: Array<{ category: string; potentialSavings: string; recommendation: string }>;
  }>;

  // Plaid operations
  getPlaidItems(organizationId: number): Promise<PlaidItem[]>;
  getPlaidItem(itemId: string): Promise<PlaidItem | undefined>;
  getPlaidItemByPlaidId(plaidItemId: string): Promise<PlaidItem | undefined>;
  createPlaidItem(item: InsertPlaidItem): Promise<PlaidItem>;
  deletePlaidItem(id: number): Promise<void>;
  updatePlaidItemStatus(id: number, updates: { status?: 'active' | 'login_required' | 'error' | 'pending'; errorCode?: string | null; errorMessage?: string | null; lastSyncedAt?: Date }): Promise<void>;
  updatePlaidItemCursor(id: number, cursor: string): Promise<void>;
  getPlaidAccounts(plaidItemId: number): Promise<PlaidAccount[]>;
  getAllPlaidAccounts(organizationId: number): Promise<Array<PlaidAccount & { institutionName: string | null; itemId: string }>>;
  createPlaidAccount(account: InsertPlaidAccount): Promise<PlaidAccount>;
  updatePlaidAccountBalances(accountId: string, currentBalance: string, availableBalance: string): Promise<void>;
  updatePlaidAccountAuth(accountId: string, data: { accountNumber: string | null; routingNumber: string | null; wireRoutingNumber: string | null }): Promise<void>;
  updatePlaidAccountIdentity(accountId: string, data: { ownerNames: string[]; ownerEmails: string[]; ownerPhoneNumbers: string[]; ownerAddresses: any[] }): Promise<void>;
  getPlaidAccountByAccountId(accountId: string): Promise<PlaidAccount | undefined>;
  updatePlaidAccountInitialBalance(accountId: string, initialBalance: string, initialBalanceDate: string): Promise<void>;
  clearPlaidAccountSensitiveData(plaidItemId: number): Promise<void>;
  deletePlaidAccountByAccountId(accountId: string): Promise<void>;

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
  getTransactionIdsLinkedToBills(organizationId: number): Promise<number[]>;

  // Dismissed pattern operations
  getDismissedPatterns(organizationId: number): Promise<DismissedPattern[]>;
  createDismissedPattern(pattern: InsertDismissedPattern & { dismissedBy: string }): Promise<DismissedPattern>;
  deleteDismissedPattern(id: number): Promise<void>;
  isPatternDismissed(organizationId: number, vendorName: string, patternType: 'income' | 'expense'): Promise<boolean>;

  // Auto-pay rule operations
  getAutoPayRules(organizationId: number): Promise<Array<AutoPayRule & { vendorName: string | null }>>;
  getAutoPayRule(id: number): Promise<AutoPayRule | undefined>;
  createAutoPayRule(rule: InsertAutoPayRule): Promise<AutoPayRule>;
  updateAutoPayRule(id: number, updates: Partial<InsertAutoPayRule>): Promise<AutoPayRule>;
  deleteAutoPayRule(id: number): Promise<void>;
  getActiveAutoPayRules(organizationId: number): Promise<Array<AutoPayRule & { vendorName: string | null }>>;
  getMatchingAutoPayRules(bill: Bill): Promise<Array<AutoPayRule & { vendorName: string | null }>>;

  // Scheduled payment operations
  getScheduledPayments(organizationId: number): Promise<Array<ScheduledPayment & { billNumber: string; vendorName: string | null }>>;
  getScheduledPayment(id: number): Promise<ScheduledPayment | undefined>;
  createScheduledPayment(payment: InsertScheduledPayment): Promise<ScheduledPayment>;
  updateScheduledPayment(id: number, updates: Partial<InsertScheduledPayment>): Promise<ScheduledPayment>;
  deleteScheduledPayment(id: number): Promise<void>;
  getScheduledPaymentsByBill(billId: number): Promise<ScheduledPayment[]>;
  getPendingScheduledPayments(organizationId: number, beforeDate?: Date): Promise<Array<ScheduledPayment & { billNumber: string; vendorName: string | null; billTotalAmount: string }>>;
  processScheduledPayment(id: number): Promise<ScheduledPayment>;

  // Bill payment operations
  getBillPayments(organizationId: number): Promise<Array<BillPayment & { billNumber: string; vendorName: string | null }>>;
  getBillPayment(id: number): Promise<BillPayment | undefined>;
  createBillPayment(payment: InsertBillPayment): Promise<BillPayment>;
  getBillPaymentsByBill(billId: number): Promise<BillPayment[]>;
  getTotalPaidForBill(billId: number): Promise<string>;

  // Vendor payment details operations
  getVendorPaymentDetails(vendorId: number, organizationId: number): Promise<VendorPaymentDetails | undefined>;
  createVendorPaymentDetails(details: InsertVendorPaymentDetails): Promise<VendorPaymentDetails>;
  updateVendorPaymentDetails(id: number, updates: Partial<InsertVendorPaymentDetails>): Promise<VendorPaymentDetails>;
  deleteVendorPaymentDetails(id: number): Promise<void>;

  // Finch connection operations
  getFinchConnectionsByOrganization(organizationId: number): Promise<FinchConnection[]>;
  getFinchConnectionByConnectionId(connectionId: string): Promise<FinchConnection | undefined>;
  getFinchConnectionById(id: number): Promise<FinchConnection | undefined>;
  createFinchConnection(connection: InsertFinchConnection): Promise<FinchConnection>;
  updateFinchConnection(id: number, updates: Partial<InsertFinchConnection>): Promise<FinchConnection>;
  deleteFinchConnection(id: number): Promise<void>;

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

  // Custom report operations
  getCustomReports(organizationId: number): Promise<CustomReport[]>;
  getCustomReport(id: number): Promise<CustomReport | undefined>;
  createCustomReport(report: InsertCustomReport): Promise<CustomReport>;
  updateCustomReport(id: number, updates: Partial<InsertCustomReport>): Promise<CustomReport>;
  deleteCustomReport(id: number): Promise<void>;
  executeCustomReport(id: number, dateFrom?: string, dateTo?: string): Promise<any[]>;

  // Audit log operations
  getAuditLogs(organizationId: number, filters?: {
    entityType?: string;
    entityId?: string;
    userId?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<Array<AuditLog & { userName: string; userEmail: string }>>;
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  verifyAuditLogChain(organizationId: number): Promise<{
    isValid: boolean;
    tamperedIndices: number[];
    brokenChainIndices: number[];
    nullHashIndices: number[];
    message: string;
  }>;
  repairAuditLogChain(organizationId: number): Promise<{
    repaired: number;
    nullHashesFixed: number;
    brokenLinksFixed: number;
    message: string;
  }>;
  logAuditTrail(params: {
    organizationId: number;
    userId: string;
    entityType: string;
    entityId: string;
    action: 'create' | 'update' | 'delete';
    oldValues?: any;
    newValues?: any;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<void>;
  logCreate(organizationId: number, userId: string, entityType: string, entityId: string, newValues: any): Promise<void>;
  logUpdate(organizationId: number, userId: string, entityType: string, entityId: string, oldValues: any, newValues: any): Promise<void>;
  logDelete(organizationId: number, userId: string, entityType: string, entityId: string, oldValues: any): Promise<void>;

  // Team operations
  getTeams(organizationId: number): Promise<Team[]>;
  getTeam(id: number): Promise<Team | undefined>;
  createTeam(team: InsertTeam): Promise<Team>;
  updateTeam(id: number, updates: Partial<InsertTeam>): Promise<Team>;
  deleteTeam(id: number): Promise<void>;

  // Employee operations
  getEmployees(organizationId: number): Promise<Employee[]>;
  getEmployee(id: number): Promise<Employee | undefined>;
  getActiveEmployees(organizationId: number): Promise<Employee[]>;
  createEmployee(employee: InsertEmployee): Promise<Employee>;
  updateEmployee(id: number, updates: Partial<InsertEmployee>): Promise<Employee>;
  deleteEmployee(id: number): Promise<void>;

  // Deduction operations
  getDeductions(organizationId: number): Promise<Deduction[]>;
  getDeduction(id: number): Promise<Deduction | undefined>;
  getActiveDeductions(organizationId: number): Promise<Deduction[]>;
  createDeduction(deduction: InsertDeduction): Promise<Deduction>;
  updateDeduction(id: number, updates: Partial<InsertDeduction>): Promise<Deduction>;
  deleteDeduction(id: number): Promise<void>;

  // Payroll run operations
  getPayrollRuns(organizationId: number): Promise<PayrollRun[]>;
  getPayrollRun(id: number): Promise<PayrollRun | undefined>;
  createPayrollRun(payrollRun: InsertPayrollRun): Promise<PayrollRun>;
  updatePayrollRun(id: number, updates: Partial<InsertPayrollRun>): Promise<PayrollRun>;
  deletePayrollRun(id: number): Promise<void>;
  processPayrollRun(id: number, userId: string): Promise<PayrollRun>;

  // Payroll item operations
  getPayrollItems(payrollRunId: number): Promise<Array<PayrollItem & { employeeName: string; employeeNumber: string | null }>>;
  getPayrollItem(id: number): Promise<PayrollItem | undefined>;
  createPayrollItem(payrollItem: InsertPayrollItem): Promise<PayrollItem>;
  updatePayrollItem(id: number, updates: Partial<InsertPayrollItem>): Promise<PayrollItem>;
  deletePayrollItem(id: number): Promise<void>;
  getPayrollItemDeductions(payrollItemId: number): Promise<Array<PayrollItemDeduction & { deductionName: string }>>;
  createPayrollItemDeduction(deduction: InsertPayrollItemDeduction): Promise<PayrollItemDeduction>;
  deletePayrollItemDeduction(id: number): Promise<void>;

  // Nonprofit-specific: Fund operations
  getFunds(organizationId: number): Promise<Fund[]>;
  getFund(id: number): Promise<Fund | undefined>;
  createFund(fund: InsertFund): Promise<Fund>;
  updateFund(id: number, updates: Partial<InsertFund>): Promise<Fund>;
  deleteFund(id: number): Promise<void>;
  updateFundBalance(fundId: number, amount: string, isIncrease: boolean): Promise<Fund>;
  getFundTransactions(fundId: number): Promise<Transaction[]>;
  getFundAccountingSummary(organizationId: number): Promise<{
    bankBalance: number;
    grantFunding: number;
    grantSpending: number;
    restrictedFunds: number;
    generalFund: number;
  }>;

  // Nonprofit-specific: Program operations
  getPrograms(organizationId: number): Promise<Program[]>;
  getProgram(id: number): Promise<Program | undefined>;
  createProgram(program: InsertProgram): Promise<Program>;
  updateProgram(id: number, updates: Partial<InsertProgram>): Promise<Program>;
  deleteProgram(id: number): Promise<void>;
  getProgramExpenses(programId: number, startDate?: Date, endDate?: Date): Promise<Array<Transaction & { totalAmount: string }>>;
  getProgramBudgetVsActual(organizationId: number, startDate?: Date, endDate?: Date): Promise<Array<{
    programId: number;
    programName: string;
    budget: string;
    actual: string;
    variance: string;
    percentUsed: number;
    status: 'under_budget' | 'on_track' | 'over_budget';
  }>>;

  // Mileage tracking operations
  getMileageRates(organizationId: number): Promise<MileageRate[]>;
  getMileageRate(id: number): Promise<MileageRate | undefined>;
  createMileageRate(rate: InsertMileageRate): Promise<MileageRate>;
  updateMileageRate(id: number, updates: Partial<InsertMileageRate>): Promise<MileageRate>;
  deleteMileageRate(id: number): Promise<void>;
  getDefaultMileageRate(organizationId: number, rateType?: string): Promise<MileageRate | undefined>;

  getMileageExpenses(organizationId: number, filters?: { userId?: string; status?: string; startDate?: Date; endDate?: Date }): Promise<MileageExpense[]>;
  getMileageExpense(id: number): Promise<MileageExpense | undefined>;
  createMileageExpense(expense: InsertMileageExpense): Promise<MileageExpense>;
  updateMileageExpense(id: number, updates: Partial<InsertMileageExpense>): Promise<MileageExpense>;
  deleteMileageExpense(id: number): Promise<void>;
  approveMileageExpense(id: number, approvedBy: string): Promise<MileageExpense>;
  rejectMileageExpense(id: number, approvedBy: string, notes?: string): Promise<MileageExpense>;

  // Per diem operations
  getPerDiemRates(organizationId: number): Promise<PerDiemRate[]>;
  getPerDiemRate(id: number): Promise<PerDiemRate | undefined>;
  createPerDiemRate(rate: InsertPerDiemRate): Promise<PerDiemRate>;
  updatePerDiemRate(id: number, updates: Partial<InsertPerDiemRate>): Promise<PerDiemRate>;
  deletePerDiemRate(id: number): Promise<void>;
  getPerDiemRateByLocation(organizationId: number, location: string): Promise<PerDiemRate | undefined>;

  getPerDiemExpenses(organizationId: number, filters?: { userId?: string; status?: string; startDate?: Date; endDate?: Date }): Promise<PerDiemExpense[]>;
  getPerDiemExpense(id: number): Promise<PerDiemExpense | undefined>;
  createPerDiemExpense(expense: InsertPerDiemExpense): Promise<PerDiemExpense>;
  updatePerDiemExpense(id: number, updates: Partial<InsertPerDiemExpense>): Promise<PerDiemExpense>;
  deletePerDiemExpense(id: number): Promise<void>;
  approvePerDiemExpense(id: number, approvedBy: string): Promise<PerDiemExpense>;
  rejectPerDiemExpense(id: number, approvedBy: string, notes?: string): Promise<PerDiemExpense>;

  // Nonprofit-specific: Pledge operations
  getPledges(organizationId: number): Promise<Array<Pledge & { donorName: string }>>;
  getPledge(id: number): Promise<Pledge | undefined>;
  getPledgesByDonor(donorId: number): Promise<Pledge[]>;
  getOverduePledges(organizationId: number): Promise<Array<Pledge & { donorName: string }>>;
  createPledge(pledge: InsertPledge): Promise<Pledge>;
  updatePledge(id: number, updates: Partial<InsertPledge>): Promise<Pledge>;
  deletePledge(id: number): Promise<void>;
  recordPledgePayment(pledgeId: number, payment: InsertPledgePayment): Promise<{ pledge: Pledge; payment: PledgePayment }>;

  // Nonprofit-specific: Pledge payment operations
  getPledgePayments(pledgeId: number): Promise<PledgePayment[]>;
  getPledgePayment(id: number): Promise<PledgePayment | undefined>;
  deletePledgePayment(id: number): Promise<void>;

  // Nonprofit-specific: Donor Portal Access Token operations
  createDonorAccessToken(donorId: number, organizationId: number): Promise<DonorAccessToken>;
  getDonorByAccessToken(token: string): Promise<{ donor: Donor; organizationId: number } | undefined>;
  markDonorAccessTokenUsed(token: string): Promise<void>;
  getDonorPortalData(donorId: number): Promise<{
    donor: Donor;
    pledges: Pledge[];
    donationHistory: Transaction[];
    letters: DonorLetter[];
    organization: Organization;
  }>;

  // Nonprofit-specific: Enhanced grant operations
  getGrant(id: number): Promise<Grant | undefined>;
  updateGrant(id: number, updates: Partial<InsertGrant>): Promise<Grant>;
  deleteGrant(id: number): Promise<void>;
  getGrantsWithUpcomingDeadlines(organizationId: number, daysAhead: number): Promise<Grant[]>;
  updateGrantCompliance(id: number, status: 'compliant' | 'at_risk' | 'non_compliant' | 'pending_review', notes?: string): Promise<Grant>;

  // Nonprofit-specific: Functional expense reporting
  getFunctionalExpenseReport(organizationId: number, startDate: Date, endDate: Date): Promise<{
    programExpenses: string;
    administrativeExpenses: string;
    fundraisingExpenses: string;
    totalExpenses: string;
    programPercentage: number;
    administrativePercentage: number;
    fundraisingPercentage: number;
    expensesByProgram: Array<{ programId: number; programName: string; amount: string }>;
    expensesByCategory: Array<{ functionalCategory: string; categoryName: string; amount: string }>;
  }>;

  // Nonprofit-specific: Form 990 reporting
  getForm990Data(organizationId: number, taxYear: number): Promise<{
    totalRevenue: string;
    totalExpenses: string;
    programServiceExpenses: string;
    managementExpenses: string;
    fundraisingExpenses: string;
    totalAssets: string;
    totalLiabilities: string;
    netAssets: string;
    revenueBySource: Array<{ source: string; amount: string }>;
    expensesByFunction: Array<{ function: string; amount: string }>;
    grants: Array<{ grantorName: string; amount: string; purpose: string }>;
  }>;

  // For-profit: Contract operations
  getContracts(organizationId: number): Promise<Contract[]>;
  getContract(id: number): Promise<Contract | undefined>;
  getContractsByProposalId(proposalId: number, organizationId: number): Promise<Contract[]>;
  createContract(contract: InsertContract): Promise<Contract>;
  updateContract(id: number, updates: Partial<InsertContract>): Promise<Contract>;
  deleteContract(id: number): Promise<void>;
  updateContractBilledAmount(id: number, amount: string): Promise<Contract>;

  // Document operations (for contracts, proposals, change orders)
  getDocumentsByEntity(entityType: string, entityId: number): Promise<Document[]>;
  getDocumentsByEntityWithOrg(entityType: string, entityId: number, organizationId: number): Promise<Document[]>;
  getDocument(id: number): Promise<Document | undefined>;
  createDocument(doc: InsertDocument): Promise<Document>;
  deleteDocument(id: number): Promise<void>;

  // For-profit: Contract milestone operations
  getContractMilestones(contractId: number): Promise<ContractMilestone[]>;
  getMilestonesByOrganization(organizationId: number): Promise<ContractMilestone[]>;
  getContractMilestone(id: number): Promise<ContractMilestone | undefined>;
  createContractMilestone(milestone: InsertContractMilestone): Promise<ContractMilestone>;
  updateContractMilestone(id: number, updates: Partial<InsertContractMilestone>): Promise<ContractMilestone>;
  deleteContractMilestone(id: number): Promise<void>;
  completeMilestone(id: number, completedDate: Date): Promise<ContractMilestone>;

  // For-profit: Project (Job Costing) operations
  getProjects(organizationId: number): Promise<Array<Project & { contractName?: string | null }>>;
  getProject(id: number): Promise<Project | undefined>;
  getProjectsByContract(contractId: number): Promise<Project[]>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, updates: Partial<InsertProject>): Promise<Project>;
  deleteProject(id: number): Promise<void>;
  updateProjectActualCost(id: number, amount: string): Promise<Project>;

  // For-profit: Project cost operations
  getProjectCosts(projectId: number): Promise<ProjectCost[]>;
  getProjectCost(id: number): Promise<ProjectCost | undefined>;
  createProjectCost(cost: InsertProjectCost): Promise<ProjectCost>;
  updateProjectCost(id: number, updates: Partial<InsertProjectCost>): Promise<ProjectCost>;
  deleteProjectCost(id: number): Promise<void>;
  getProjectCostsByType(projectId: number): Promise<Array<{ costType: string; totalAmount: string }>>;

  // For-profit: Time entry operations
  getTimeEntries(organizationId: number, startDate?: Date, endDate?: Date): Promise<Array<TimeEntry & { userName: string; projectName?: string | null; contractName?: string | null }>>;
  getTimeEntry(id: number): Promise<TimeEntry | undefined>;
  getTimeEntriesByUser(userId: string, organizationId: number, startDate?: Date, endDate?: Date): Promise<TimeEntry[]>;
  getTimeEntriesByProject(projectId: number): Promise<TimeEntry[]>;
  getTimeEntriesByContract(contractId: number): Promise<TimeEntry[]>;
  createTimeEntry(entry: InsertTimeEntry): Promise<TimeEntry>;
  updateTimeEntry(id: number, updates: Partial<InsertTimeEntry>): Promise<TimeEntry>;
  deleteTimeEntry(id: number): Promise<void>;
  clockOut(id: number, clockOutTime: Date): Promise<TimeEntry>;
  submitTimeEntry(id: number): Promise<TimeEntry>;
  approveTimeEntry(id: number): Promise<TimeEntry>;

  // For-profit: Indirect cost rate operations
  getIndirectCostRates(organizationId: number): Promise<IndirectCostRate[]>;
  getActiveIndirectCostRates(organizationId: number): Promise<IndirectCostRate[]>;
  getIndirectCostRate(id: number): Promise<IndirectCostRate | undefined>;
  createIndirectCostRate(rate: InsertIndirectCostRate): Promise<IndirectCostRate>;
  updateIndirectCostRate(id: number, updates: Partial<InsertIndirectCostRate>): Promise<IndirectCostRate>;
  deleteIndirectCostRate(id: number): Promise<void>;

  // For-profit: Labor burden rate operations
  getLaborBurdenRates(organizationId: number): Promise<LaborBurdenRate[]>;
  getActiveLaborBurdenRates(organizationId: number): Promise<LaborBurdenRate[]>;
  getLaborBurdenRate(id: number): Promise<LaborBurdenRate | undefined>;
  createLaborBurdenRate(rate: InsertLaborBurdenRate): Promise<LaborBurdenRate>;
  updateLaborBurdenRate(id: number, updates: Partial<InsertLaborBurdenRate>): Promise<LaborBurdenRate>;
  deleteLaborBurdenRate(id: number): Promise<void>;

  // For-profit: Billing rate operations
  getBillingRates(organizationId: number): Promise<BillingRate[]>;
  getActiveBillingRates(organizationId: number): Promise<BillingRate[]>;
  getBillingRate(id: number): Promise<BillingRate | undefined>;
  createBillingRate(rate: InsertBillingRate): Promise<BillingRate>;
  updateBillingRate(id: number, updates: Partial<InsertBillingRate>): Promise<BillingRate>;
  deleteBillingRate(id: number): Promise<void>;

  // For-profit: Project budget breakdown operations
  getProjectBudgetBreakdowns(projectId: number): Promise<ProjectBudgetBreakdown[]>;
  getProjectBudgetBreakdown(id: number): Promise<ProjectBudgetBreakdown | undefined>;
  createProjectBudgetBreakdown(breakdown: InsertProjectBudgetBreakdown): Promise<ProjectBudgetBreakdown>;
  updateProjectBudgetBreakdown(id: number, updates: Partial<InsertProjectBudgetBreakdown>): Promise<ProjectBudgetBreakdown>;
  deleteProjectBudgetBreakdown(id: number): Promise<void>;

  // For-profit: Project revenue ledger operations
  getProjectRevenueLedger(projectId: number, limit?: number, offset?: number): Promise<ProjectRevenueLedger[]>;
  getProjectRevenueLedgerCount(projectId: number): Promise<number>;
  getProjectRevenueLedgerEntry(id: number): Promise<ProjectRevenueLedger | undefined>;
  createProjectRevenueLedgerEntry(entry: InsertProjectRevenueLedger): Promise<ProjectRevenueLedger>;
  updateProjectRevenueLedgerEntry(id: number, updates: Partial<InsertProjectRevenueLedger>): Promise<ProjectRevenueLedger>;
  deleteProjectRevenueLedgerEntry(id: number): Promise<void>;

  // For-profit: Project financial snapshot operations
  getProjectFinancialSnapshots(projectId: number, limit?: number, offset?: number): Promise<ProjectFinancialSnapshot[]>;
  getProjectFinancialSnapshotsCount(projectId: number): Promise<number>;
  getLatestProjectFinancialSnapshot(projectId: number): Promise<ProjectFinancialSnapshot | undefined>;
  createProjectFinancialSnapshot(snapshot: InsertProjectFinancialSnapshot): Promise<ProjectFinancialSnapshot>;
  deleteProjectFinancialSnapshot(id: number): Promise<void>;

  // Nonprofit: Time/Effort Reporting operations
  getTimeEffortReports(organizationId: number): Promise<TimeEffortReport[]>;
  getTimeEffortReport(id: number): Promise<TimeEffortReport | undefined>;
  createTimeEffortReport(report: InsertTimeEffortReport): Promise<TimeEffortReport>;
  updateTimeEffortReport(id: number, updates: Partial<InsertTimeEffortReport>): Promise<TimeEffortReport>;
  deleteTimeEffortReport(id: number): Promise<void>;

  // Nonprofit: Cost Allowability Check operations
  getCostAllowabilityChecks(organizationId: number): Promise<CostAllowabilityCheck[]>;
  getCostAllowabilityCheck(id: number): Promise<CostAllowabilityCheck | undefined>;
  createCostAllowabilityCheck(check: InsertCostAllowabilityCheck): Promise<CostAllowabilityCheck>;
  updateCostAllowabilityCheck(id: number, updates: Partial<InsertCostAllowabilityCheck>): Promise<CostAllowabilityCheck>;
  deleteCostAllowabilityCheck(id: number): Promise<void>;

  // Nonprofit: Sub Award operations
  getSubAwards(organizationId: number): Promise<SubAward[]>;
  getSubAward(id: number): Promise<SubAward | undefined>;
  createSubAward(award: InsertSubAward): Promise<SubAward>;
  updateSubAward(id: number, updates: Partial<InsertSubAward>): Promise<SubAward>;
  deleteSubAward(id: number): Promise<void>;

  // Nonprofit: Federal Financial Report operations
  getFederalFinancialReports(organizationId: number): Promise<FederalFinancialReport[]>;
  getFederalFinancialReport(id: number): Promise<FederalFinancialReport | undefined>;
  createFederalFinancialReport(report: InsertFederalFinancialReport): Promise<FederalFinancialReport>;
  updateFederalFinancialReport(id: number, updates: Partial<InsertFederalFinancialReport>): Promise<FederalFinancialReport>;
  deleteFederalFinancialReport(id: number): Promise<void>;

  // Nonprofit: Audit Prep Item operations
  getAuditPrepItems(organizationId: number): Promise<AuditPrepItem[]>;
  getAuditPrepItem(id: number): Promise<AuditPrepItem | undefined>;
  createAuditPrepItem(item: InsertAuditPrepItem): Promise<AuditPrepItem>;
  updateAuditPrepItem(id: number, updates: Partial<InsertAuditPrepItem>): Promise<AuditPrepItem>;
  deleteAuditPrepItem(id: number): Promise<void>;

  // Notification operations
  createNotification(notification: InsertNotification): Promise<Notification>;
  getNotifications(userId: string, organizationId: number, filters?: { isRead?: boolean; limit?: number }): Promise<Notification[]>;
  getNotification(id: number): Promise<Notification | undefined>;
  markNotificationAsRead(id: number): Promise<void>;
  markAllNotificationsAsRead(userId: string, organizationId: number): Promise<void>;
  getUnreadNotificationCount(userId: string, organizationId: number): Promise<number>;
  deleteNotification(id: number): Promise<void>;

  // For-profit: Proposal/Bid Management operations
  getProposals(organizationId: number): Promise<Proposal[]>;
  getProposal(id: number): Promise<Proposal | undefined>;
  createProposal(proposal: InsertProposal): Promise<Proposal>;
  updateProposal(id: number, updates: Partial<InsertProposal>): Promise<Proposal>;
  deleteProposal(id: number): Promise<void>;

  // For-profit: Subcontractor Management operations
  getSubcontractors(organizationId: number): Promise<Subcontractor[]>;
  getSubcontractor(id: number): Promise<Subcontractor | undefined>;
  createSubcontractor(subcontractor: InsertSubcontractor): Promise<Subcontractor>;
  updateSubcontractor(id: number, updates: Partial<InsertSubcontractor>): Promise<Subcontractor>;
  deleteSubcontractor(id: number): Promise<void>;

  // For-profit: Change Order Management operations
  getChangeOrders(organizationId: number): Promise<ChangeOrder[]>;
  getChangeOrder(id: number): Promise<ChangeOrder | undefined>;
  getChangeOrdersByContract(contractId: number, organizationId: number): Promise<ChangeOrder[]>;
  createChangeOrder(changeOrder: InsertChangeOrder): Promise<ChangeOrder>;
  updateChangeOrder(id: number, updates: Partial<InsertChangeOrder>): Promise<ChangeOrder>;
  deleteChangeOrder(id: number): Promise<void>;

  // Form/Survey operations
  getForms(organizationId: number, formType?: 'survey' | 'form'): Promise<Form[]>;
  getForm(id: number): Promise<Form | undefined>;
  getFormByPublicId(publicId: string): Promise<Form | undefined>;
  createForm(form: InsertForm): Promise<Form>;
  updateForm(id: number, updates: Partial<InsertForm>): Promise<Form>;
  deleteForm(id: number): Promise<void>;
  incrementFormResponseCount(id: number): Promise<void>;

  // Form Question operations
  getFormQuestions(formId: number): Promise<FormQuestion[]>;
  createFormQuestion(question: InsertFormQuestion): Promise<FormQuestion>;
  updateFormQuestion(id: number, updates: Partial<InsertFormQuestion>): Promise<FormQuestion>;
  deleteFormQuestion(id: number): Promise<void>;
  reorderFormQuestions(formId: number, questionIds: number[]): Promise<void>;

  // Form Response operations
  getFormResponses(formId: number): Promise<FormResponse[]>;
  getFormResponse(id: number): Promise<FormResponse | undefined>;
  createFormResponse(response: InsertFormResponse): Promise<FormResponse>;
  deleteFormResponse(id: number): Promise<void>;
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

  async getUserByStripeSubscriptionId(subscriptionId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.stripeSubscriptionId, subscriptionId));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // Use email as the conflict target since it's the stable identifier
    // This handles testing scenarios where the same email might be used with different test IDs
    // and production scenarios where email should be unique across users
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.email,
        set: {
          id: userData.id,  // Update ID in case OIDC provider changes it
          firstName: userData.firstName,
          lastName: userData.lastName,
          profileImageUrl: userData.profileImageUrl,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async upsertLocalUser(userData: { id: string; email: string; passwordHash: string; firstName?: string; lastName?: string; role?: string }): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        id: userData.id,
        email: userData.email,
        passwordHash: userData.passwordHash,
        firstName: userData.firstName || null,
        lastName: userData.lastName || null,
        role: userData.role || 'member',
      })
      .onConflictDoUpdate({
        target: users.email,
        set: {
          passwordHash: userData.passwordHash,
          firstName: userData.firstName || null,
          lastName: userData.lastName || null,
          role: userData.role || 'member',
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUserPassword(userId: string, passwordHash: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        passwordHash,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateUser(userId: string, updates: Partial<{
    stripeSubscriptionId: string | null;
    subscriptionTier: 'free' | 'core' | 'professional' | 'growth' | 'enterprise';
    subscriptionStatus: string | null;
    subscriptionCurrentPeriodEnd: Date | null;
    billingInterval: string | null;
  }>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }
  
  // MFA enforcement (NIST 800-53 IA-2(1), IA-2(2))
  async setMfaRequired(userId: string, required: boolean, gracePeriodDays: number = 30): Promise<User> {
    const gracePeriodEnd = required 
      ? new Date(Date.now() + gracePeriodDays * 24 * 60 * 60 * 1000)
      : null;
      
    const [user] = await db
      .update(users)
      .set({
        mfaRequired: required,
        mfaGracePeriodEnd: gracePeriodEnd,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }
  
  async checkMfaGracePeriod(userId: string): Promise<{ expired: boolean; daysRemaining: number | null }> {
    const user = await this.getUser(userId);
    if (!user || !user.mfaRequired || !user.mfaGracePeriodEnd) {
      return { expired: false, daysRemaining: null };
    }
    
    const now = Date.now();
    const gracePeriodEnd = user.mfaGracePeriodEnd.getTime();
    const expired = now > gracePeriodEnd;
    const daysRemaining = expired ? 0 : Math.ceil((gracePeriodEnd - now) / (24 * 60 * 60 * 1000));
    
    return { expired, daysRemaining };
  }
  
  async updateMfaNotification(userId: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        lastMfaNotification: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }
  
  async getUsersRequiringMfa(): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(eq(users.mfaRequired, true));
  }
  
  // MFA TOTP implementation (NIST 800-53 IA-2(1))
  async setupMfaSecret(userId: string, encryptedSecret: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        mfaSecret: encryptedSecret,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }
  
  async enableMfa(userId: string, hashedBackupCodes: string[]): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        mfaEnabled: true,
        mfaBackupCodes: hashedBackupCodes,
        mfaVerifiedAt: new Date(),
        mfaGracePeriodEnd: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }
  
  async disableMfa(userId: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        mfaEnabled: false,
        mfaSecret: null,
        mfaBackupCodes: null,
        mfaVerifiedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }
  
  async getMfaSecret(userId: string): Promise<string | null> {
    const user = await this.getUser(userId);
    return user?.mfaSecret || null;
  }
  
  async getMfaBackupCodes(userId: string): Promise<string[] | null> {
    const user = await this.getUser(userId);
    return (user?.mfaBackupCodes as string[] | null) || null;
  }
  
  async updateMfaBackupCodes(userId: string, hashedBackupCodes: string[]): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        mfaBackupCodes: hashedBackupCodes,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Security event logging (NIST 800-53 AU-2, AC-7)
  async logSecurityEvent(event: InsertSecurityEvent): Promise<SecurityEvent> {
    const [logEntry] = await db
      .insert(securityEventLog)
      .values(event)
      .returning();
    
    // NIST 800-53 IR-4, IR-5: Send security alerts for critical/high severity events
    // Async fire-and-forget to avoid blocking the logging operation
    if (event.severity === 'critical' || event.severity === 'high') {
      import('./securityAlerting').then(({ sendSecurityAlertIfNeeded }) => {
        sendSecurityAlertIfNeeded(this, {
          eventType: event.eventType,
          severity: event.severity,
          userId: event.userId,
          email: event.email,
          ipAddress: event.ipAddress,
          eventData: event.eventData,
          timestamp: logEntry.timestamp,
        }, event.organizationId || undefined).catch(err => {
          console.error('Failed to send security alert:', err);
        });
      }).catch(err => {
        console.error('Failed to import security alerting module:', err);
      });
    }
    
    return logEntry;
  }

  async getSecurityEvents(filters?: {
    organizationId?: number;
    userId?: string;
    eventType?: string;
    startDate?: Date;
    endDate?: Date;
    severity?: string;
    limit?: number;
  }): Promise<SecurityEvent[]> {
    let query = db.select().from(securityEventLog);
    
    const conditions = [];
    // Note: organizationId filter is not applied as the security_event_log table
    // does not have an organizationId column - security events are system-wide
    if (filters?.userId) {
      conditions.push(eq(securityEventLog.userId, filters.userId));
    }
    if (filters?.eventType) {
      conditions.push(eq(securityEventLog.eventType, filters.eventType as any));
    }
    if (filters?.severity) {
      conditions.push(eq(securityEventLog.severity, filters.severity as any));
    }
    if (filters?.startDate) {
      conditions.push(gte(securityEventLog.timestamp, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(securityEventLog.timestamp, filters.endDate));
    }

    if (conditions.length === 1) {
      query = query.where(conditions[0]) as any;
    } else if (conditions.length > 1) {
      query = query.where(and(...conditions)) as any;
    }

    query = query.orderBy(desc(securityEventLog.timestamp)) as any;

    if (filters?.limit) {
      query = query.limit(filters.limit) as any;
    }

    return await query;
  }

  // Failed login tracking (NIST 800-53 AC-7)
  async recordFailedLoginAttempt(email: string, ipAddress: string, userId?: string): Promise<void> {
    await db.insert(failedLoginAttempts).values({
      email,
      ipAddress,
      userId,
      lockoutUntil: null,
    });
  }

  async getFailedLoginAttempts(email: string, ipAddress: string, minutesAgo: number): Promise<FailedLoginAttempt[]> {
    const cutoffTime = new Date(Date.now() - minutesAgo * 60 * 1000);
    
    return await db
      .select()
      .from(failedLoginAttempts)
      .where(
        and(
          eq(failedLoginAttempts.email, email),
          eq(failedLoginAttempts.ipAddress, ipAddress),
          gte(failedLoginAttempts.attemptedAt, cutoffTime)
        )
      )
      .orderBy(desc(failedLoginAttempts.attemptedAt));
  }

  async getFailedLoginAttemptsByEmail(email: string, minutesAgo: number): Promise<FailedLoginAttempt[]> {
    const cutoffTime = new Date(Date.now() - minutesAgo * 60 * 1000);
    
    return await db
      .select()
      .from(failedLoginAttempts)
      .where(
        and(
          eq(failedLoginAttempts.email, email),
          gte(failedLoginAttempts.attemptedAt, cutoffTime)
        )
      )
      .orderBy(desc(failedLoginAttempts.attemptedAt));
  }

  async lockAccount(email: string, lockoutMinutes: number): Promise<void> {
    const lockoutUntil = new Date(Date.now() + lockoutMinutes * 60 * 1000);
    
    await db.insert(failedLoginAttempts).values({
      email,
      ipAddress: 'system',
      lockoutUntil,
    });
  }

  async unlockAccount(email: string): Promise<void> {
    await db
      .delete(failedLoginAttempts)
      .where(eq(failedLoginAttempts.email, email));
  }

  async isAccountLocked(email: string): Promise<boolean> {
    const [lockRecord] = await db
      .select()
      .from(failedLoginAttempts)
      .where(
        and(
          eq(failedLoginAttempts.email, email),
          sql`${failedLoginAttempts.lockoutUntil} IS NOT NULL`,
          gte(failedLoginAttempts.lockoutUntil, new Date())
        )
      )
      .orderBy(desc(failedLoginAttempts.lockoutUntil))
      .limit(1);
    
    return !!lockRecord;
  }

  async clearFailedLoginAttempts(email: string): Promise<void> {
    await db
      .delete(failedLoginAttempts)
      .where(eq(failedLoginAttempts.email, email));
  }

  // Vulnerability scanning (NIST 800-53 RA-5, SI-2)
  async createVulnerabilityScan(scan: InsertVulnerabilityScan): Promise<VulnerabilityScan> {
    const [result] = await db
      .insert(vulnerabilityScans)
      .values(scan)
      .returning();
    return result;
  }

  async updateVulnerabilityScan(id: number, updates: Partial<InsertVulnerabilityScan>): Promise<VulnerabilityScan> {
    const [result] = await db
      .update(vulnerabilityScans)
      .set(updates)
      .where(eq(vulnerabilityScans.id, id))
      .returning();
    return result;
  }

  async getLatestVulnerabilityScan(): Promise<VulnerabilityScan | undefined> {
    const [scan] = await db
      .select()
      .from(vulnerabilityScans)
      .orderBy(desc(vulnerabilityScans.startedAt))
      .limit(1);
    return scan;
  }

  async getVulnerabilityScans(limit: number = 10): Promise<VulnerabilityScan[]> {
    return await db
      .select()
      .from(vulnerabilityScans)
      .orderBy(desc(vulnerabilityScans.startedAt))
      .limit(limit);
  }

  // Organization operations
  async getOrganizations(userId: string): Promise<Array<Organization & { userRole: string }>> {
    // Special handling for super admin users - they can see all organizations
    const superAdminUserIds = ['local_admin_default', 'local_admin_marcy'];
    const superAdminEmails = ['tech@jandmsolutions.com', 'marcy.freeburg@gmail.com'];
    
    // Check by user ID first
    let isSuperAdmin = superAdminUserIds.includes(userId);
    
    // If not found by ID, check by email
    if (!isSuperAdmin) {
      const user = await this.getUser(userId);
      if (user && superAdminEmails.includes(user.email.toLowerCase())) {
        isSuperAdmin = true;
      }
    }
    
    if (isSuperAdmin) {
      const allOrgs = await db.select().from(organizations);
      return allOrgs.map(org => ({
        ...org,
        taxId: org.taxId ? decryptField(org.taxId) : null,
        userRole: 'admin',
      }));
    }
    
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

    // Decrypt sensitive fields
    return result.map(r => ({
      ...r.organization,
      taxId: r.organization.taxId ? decryptField(r.organization.taxId) : null,
      userRole: r.role,
    }));
  }

  async getOrganization(id: number): Promise<Organization | undefined> {
    const [org] = await db.select().from(organizations).where(eq(organizations.id, id));
    if (!org) return undefined;
    
    // Decrypt sensitive fields
    return {
      ...org,
      taxId: org.taxId ? decryptField(org.taxId) : null,
    };
  }

  async createOrganization(orgData: InsertOrganization, userId: string): Promise<Organization> {
    const encryptedData = {
      ...orgData,
      taxId: orgData.taxId ? encryptField(orgData.taxId) : null,
    };
    
    const [org] = await db
      .insert(organizations)
      .values(encryptedData)
      .returning();

    // Create owner role for the user
    await db.insert(userOrganizationRoles).values({
      userId,
      organizationId: org.id,
      role: 'owner',
    });

    // Decrypt before returning
    return {
      ...org,
      taxId: org.taxId ? decryptField(org.taxId) : null,
    };
  }

  async updateOrganization(id: number, updates: Partial<InsertOrganization>): Promise<Organization> {
    const encryptedUpdates = {
      ...updates,
      taxId: updates.taxId !== undefined ? (updates.taxId ? encryptField(updates.taxId) : null) : undefined,
      updatedAt: new Date(),
    };
    
    const [updated] = await db
      .update(organizations)
      .set(encryptedUpdates)
      .where(eq(organizations.id, id))
      .returning();
    
    // Decrypt before returning
    return {
      ...updated,
      taxId: updated.taxId ? decryptField(updated.taxId) : null,
    };
  }

  async deleteOrganization(id: number): Promise<void> {
    // Due to CASCADE constraints, all related data will be automatically deleted
    await db.delete(organizations).where(eq(organizations.id, id));
  }

  // User organization role operations
  async getUserRole(userId: string, organizationId: number): Promise<UserOrganizationRole | undefined> {
    // Special handling for super admin users - they have admin access to all organizations
    const superAdminUserIds = ['local_admin_default', 'local_admin_marcy'];
    const superAdminEmails = ['tech@jandmsolutions.com', 'marcy.freeburg@gmail.com'];
    
    // Check by user ID first
    let isSuperAdmin = superAdminUserIds.includes(userId);
    
    // If not found by ID, check by email
    if (!isSuperAdmin) {
      const user = await this.getUser(userId);
      if (user && superAdminEmails.includes(user.email.toLowerCase())) {
        isSuperAdmin = true;
      }
    }
    
    if (isSuperAdmin) {
      // Return a synthetic admin role for super admin users
      return {
        id: -1,
        userId,
        organizationId,
        role: 'admin',
        permissions: 'full_access',
        createdAt: new Date(),
      } as UserOrganizationRole;
    }
    
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

  // Donor operations
  async getDonors(organizationId: number): Promise<Donor[]> {
    const donorList = await db
      .select()
      .from(donors)
      .where(eq(donors.organizationId, organizationId))
      .orderBy(donors.name);
    
    // Decrypt sensitive fields
    return donorList.map(d => ({
      ...d,
      taxId: d.taxId ? decryptField(d.taxId) : null,
    }));
  }

  async getDonor(id: number): Promise<Donor | undefined> {
    const [donor] = await db
      .select()
      .from(donors)
      .where(eq(donors.id, id));
    
    if (!donor) return undefined;
    
    // Decrypt sensitive fields
    return {
      ...donor,
      taxId: donor.taxId ? decryptField(donor.taxId) : null,
    };
  }

  async createDonor(donor: InsertDonor): Promise<Donor> {
    const encryptedData = {
      ...donor,
      taxId: donor.taxId ? encryptField(donor.taxId) : null,
    };
    
    const [newDonor] = await db
      .insert(donors)
      .values(encryptedData)
      .returning();
    
    // Decrypt before returning
    return {
      ...newDonor,
      taxId: newDonor.taxId ? decryptField(newDonor.taxId) : null,
    };
  }

  async updateDonor(id: number, updates: Partial<InsertDonor>): Promise<Donor> {
    const encryptedUpdates = {
      ...updates,
      taxId: updates.taxId !== undefined ? (updates.taxId ? encryptField(updates.taxId) : null) : undefined,
    };
    
    const [donor] = await db
      .update(donors)
      .set(encryptedUpdates)
      .where(eq(donors.id, id))
      .returning();
    
    // Decrypt before returning
    return {
      ...donor,
      taxId: donor.taxId ? decryptField(donor.taxId) : null,
    };
  }

  async deleteDonor(id: number): Promise<void> {
    await db.delete(donors).where(eq(donors.id, id));
  }

  async getDonorDonations(donorId: number, year?: number): Promise<Array<Transaction & { donorName: string }>> {
    const conditions = [eq(transactions.donorId, donorId)];
    
    if (year) {
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31, 23, 59, 59);
      conditions.push(gte(transactions.date, startDate));
      conditions.push(lte(transactions.date, endDate));
    }

    const results = await db
      .select({
        transaction: transactions,
        donorName: donors.name,
      })
      .from(transactions)
      .innerJoin(donors, eq(transactions.donorId, donors.id))
      .where(and(...conditions))
      .orderBy(transactions.date);

    return results.map(r => ({
      ...r.transaction,
      donorName: r.donorName,
    }));
  }

  async getDonationsByYear(organizationId: number, year: number): Promise<Array<{ donor: Donor; totalAmount: string; donations: Transaction[] }>> {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59);

    // Get all donations for the year
    const donationsData = await db
      .select({
        transaction: transactions,
        donor: donors,
      })
      .from(transactions)
      .innerJoin(donors, eq(transactions.donorId, donors.id))
      .where(
        and(
          eq(transactions.organizationId, organizationId),
          eq(transactions.type, 'income'),
          gte(transactions.date, startDate),
          lte(transactions.date, endDate)
        )
      )
      .orderBy(donors.name, transactions.date);

    // Group by donor and calculate totals
    const donorMap = new Map<number, { donor: Donor; totalAmount: number; donations: Transaction[] }>();
    
    donationsData.forEach(({ transaction, donor }) => {
      if (!donorMap.has(donor.id)) {
        donorMap.set(donor.id, {
          donor,
          totalAmount: 0,
          donations: [],
        });
      }
      const entry = donorMap.get(donor.id)!;
      entry.totalAmount += parseFloat(transaction.amount);
      entry.donations.push(transaction);
    });

    return Array.from(donorMap.values()).map(entry => ({
      ...entry,
      totalAmount: entry.totalAmount.toFixed(2),
    }));
  }

  // Donor Letter operations
  async getDonorLetters(organizationId: number): Promise<Array<DonorLetter & { donorName: string }>> {
    const results = await db
      .select({
        letter: donorLetters,
        donorName: donors.name,
      })
      .from(donorLetters)
      .innerJoin(donors, eq(donorLetters.donorId, donors.id))
      .where(eq(donorLetters.organizationId, organizationId))
      .orderBy(desc(donorLetters.year), desc(donorLetters.createdAt));

    return results.map(r => ({
      ...r.letter,
      donorName: r.donorName,
    }));
  }

  async getDonorLetter(id: number): Promise<DonorLetter | undefined> {
    const [letter] = await db
      .select()
      .from(donorLetters)
      .where(eq(donorLetters.id, id));
    return letter;
  }

  async createDonorLetter(letterData: InsertDonorLetter, userId: string): Promise<DonorLetter> {
    const [letter] = await db
      .insert(donorLetters)
      .values({
        ...letterData,
        createdBy: userId,
      })
      .returning();
    return letter;
  }

  async updateDonorLetter(id: number, updates: Partial<InsertDonorLetter>): Promise<DonorLetter> {
    // Only allow updates if letter is in draft status
    const existing = await this.getDonorLetter(id);
    if (existing && existing.letterStatus !== 'draft') {
      throw new Error('Cannot update finalized or voided letter');
    }

    const [letter] = await db
      .update(donorLetters)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(donorLetters.id, id))
      .returning();
    return letter;
  }

  async finalizeDonorLetter(id: number, renderedHtml: string): Promise<DonorLetter> {
    const [letter] = await db
      .update(donorLetters)
      .set({
        letterStatus: 'finalized',
        renderedHtml,
        generatedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(donorLetters.id, id))
      .returning();
    return letter;
  }

  async deleteDonorLetter(id: number): Promise<void> {
    await db
      .delete(donorLetters)
      .where(eq(donorLetters.id, id));
  }

  async getDonorLettersByDonorAndYear(donorId: number, year: number): Promise<DonorLetter[]> {
    return await db
      .select()
      .from(donorLetters)
      .where(and(eq(donorLetters.donorId, donorId), eq(donorLetters.year, year)));
  }

  async updateDonorLetterDelivery(id: number, delivery: { letterStatus: string; deliveryMode: string; deliveryRef: string }): Promise<DonorLetter> {
    const [letter] = await db
      .update(donorLetters)
      .set({
        letterStatus: delivery.letterStatus as any,
        deliveryMode: delivery.deliveryMode,
        deliveryRef: delivery.deliveryRef,
        updatedAt: new Date(),
      })
      .where(eq(donorLetters.id, id))
      .returning();
    return letter;
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

  async getTransactionsPaginated(organizationId: number, options: { limit: number; offset: number; search?: string; startDate?: string; endDate?: string }): Promise<{ transactions: Transaction[]; total: number; hasMore: boolean }> {
    const { limit, offset, search, startDate, endDate } = options;
    
    // Build where conditions array
    const conditions: any[] = [eq(transactions.organizationId, organizationId)];
    
    if (search && search.trim()) {
      const searchTerm = `%${search.trim().toLowerCase()}%`;
      conditions.push(
        or(
          sql`LOWER(${transactions.description}) LIKE ${searchTerm}`,
          sql`${transactions.amount}::text LIKE ${searchTerm}`
        )
      );
    }
    
    // Add date range filtering
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      conditions.push(sql`${transactions.date} >= ${start}`);
    }
    
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      conditions.push(sql`${transactions.date} <= ${end}`);
    }
    
    const whereConditions = conditions.length > 1 
      ? and(...conditions) as any
      : conditions[0];
    
    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(transactions)
      .where(whereConditions);
    
    const total = countResult?.count || 0;
    
    // Get paginated transactions
    const result = await db
      .select()
      .from(transactions)
      .where(whereConditions)
      .orderBy(desc(transactions.date), desc(transactions.id))
      .limit(limit)
      .offset(offset);
    
    return {
      transactions: result,
      total,
      hasMore: offset + result.length < total,
    };
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

  async getTransactionByExternalId(organizationId: number, externalId: string): Promise<Transaction | undefined> {
    const [transaction] = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.organizationId, organizationId),
          eq(transactions.externalId, externalId)
        )
      );
    return transaction;
  }

  async getTransactionsByExternalIds(organizationId: number, externalIds: string[]): Promise<Map<string, Transaction>> {
    if (externalIds.length === 0) {
      return new Map();
    }
    
    const results = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.organizationId, organizationId),
          inArray(transactions.externalId, externalIds)
        )
      );
    
    const map = new Map<string, Transaction>();
    for (const tx of results) {
      if (tx.externalId) {
        map.set(tx.externalId, tx);
      }
    }
    return map;
  }

  async findPotentialDuplicateTransactions(organizationId: number, startDate: Date, endDate: Date): Promise<Transaction[]> {
    // Fetch all transactions in the date range for batch duplicate checking
    return await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.organizationId, organizationId),
          gte(transactions.date, startDate),
          lte(transactions.date, endDate)
        )
      );
  }

  async getCategoryExamples(organizationId: number, categoryIds: number[], examplesPerCategory: number): Promise<Map<number, string[]>> {
    if (categoryIds.length === 0) {
      return new Map();
    }
    
    // Efficiently fetch limited examples per category using a single query with ROW_NUMBER
    // This avoids fetching ALL transactions
    const results = await db
      .select({
        categoryId: transactions.categoryId,
        description: transactions.description,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.organizationId, organizationId),
          inArray(transactions.categoryId, categoryIds),
          isNotNull(transactions.description)
        )
      )
      .orderBy(desc(transactions.date))
      .limit(categoryIds.length * examplesPerCategory * 2); // Fetch more to ensure coverage
    
    // Group by category and limit examples
    const examplesMap = new Map<number, string[]>();
    for (const row of results) {
      if (row.categoryId && row.description) {
        const existing = examplesMap.get(row.categoryId) || [];
        if (existing.length < examplesPerCategory) {
          existing.push(row.description);
          examplesMap.set(row.categoryId, existing);
        }
      }
    }
    
    return examplesMap;
  }

  async findMatchingManualTransaction(
    organizationId: number,
    date: Date,
    amount: string,
    description: string,
    type: 'income' | 'expense'
  ): Promise<Transaction | undefined> {
    // Find manual transactions (source = 'manual' or null, no externalId) 
    // that match by date, amount, and type
    // We normalize the date to compare just the date part (not time)
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const results = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.organizationId, organizationId),
          eq(transactions.amount, amount),
          eq(transactions.type, type),
          gte(transactions.date, startOfDay),
          lte(transactions.date, endOfDay),
          isNull(transactions.externalId),
          or(
            eq(transactions.source, 'manual'),
            isNull(transactions.source)
          )
        )
      );

    // If we found matches, try to find the best one by description similarity
    if (results.length === 0) {
      return undefined;
    }

    // Look for exact or close description match
    for (const tx of results) {
      const txDesc = tx.description.toLowerCase().trim();
      const plaidDesc = description.toLowerCase().trim();
      // Check if descriptions are similar (one contains the other, or close match)
      if (txDesc === plaidDesc || 
          txDesc.includes(plaidDesc) || 
          plaidDesc.includes(txDesc) ||
          txDesc.split(' ').some(word => word.length > 3 && plaidDesc.includes(word))) {
        return tx;
      }
    }

    // If no description match, return the first match by date/amount
    return results[0];
  }

  async findAnyMatchingTransaction(
    organizationId: number,
    date: Date,
    amount: string,
    description: string,
    type: 'income' | 'expense'
  ): Promise<Transaction | undefined> {
    // Find ANY transaction (manual or Plaid) that matches by date, amount, and type
    // Used for CSV import duplicate detection
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const results = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.organizationId, organizationId),
          eq(transactions.amount, amount),
          eq(transactions.type, type),
          gte(transactions.date, startOfDay),
          lte(transactions.date, endOfDay)
        )
      );

    if (results.length === 0) {
      return undefined;
    }

    // Look for exact or close description match
    // Only consider it a duplicate if descriptions are similar
    for (const tx of results) {
      const txDesc = tx.description.toLowerCase().trim();
      const importDesc = description.toLowerCase().trim();
      if (txDesc === importDesc || 
          txDesc.includes(importDesc) || 
          importDesc.includes(txDesc) ||
          txDesc.split(' ').some(word => word.length > 3 && importDesc.includes(word))) {
        return tx;
      }
    }

    // If no description match, NOT a duplicate - different transactions with same amount/date
    return undefined;
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

  async splitTransaction(
    transactionId: number, 
    splits: Array<{ 
      amount: string; 
      description?: string; 
      categoryId?: number | null; 
      grantId?: number | null; 
      fundId?: number | null; 
      programId?: number | null; 
      functionalCategory?: 'program' | 'administrative' | 'fundraising' | null 
    }>, 
    userId: string
  ): Promise<Transaction[]> {
    return await db.transaction(async (tx) => {
      const [parentTransaction] = await tx
        .select()
        .from(transactions)
        .where(eq(transactions.id, transactionId));
      
      if (!parentTransaction) {
        throw new Error('Transaction not found');
      }
      
      if (parentTransaction.hasSplits) {
        throw new Error('Transaction is already split');
      }
      
      if (parentTransaction.isSplitChild) {
        throw new Error('Cannot split a child transaction');
      }
      
      const totalSplitAmount = splits.reduce((sum, s) => sum + parseFloat(s.amount), 0);
      const originalAmount = parseFloat(parentTransaction.amount);
      
      if (Math.abs(totalSplitAmount - originalAmount) > 0.01) {
        throw new Error(`Split amounts (${totalSplitAmount.toFixed(2)}) must equal original amount (${originalAmount.toFixed(2)})`);
      }
      
      await tx
        .update(transactions)
        .set({
          hasSplits: true,
          originalAmount: parentTransaction.amount,
          amount: '0',
          updatedAt: new Date(),
        })
        .where(eq(transactions.id, transactionId));
      
      const createdSplits: Transaction[] = [];
      for (const split of splits) {
        const [childTransaction] = await tx
          .insert(transactions)
          .values({
            organizationId: parentTransaction.organizationId,
            date: parentTransaction.date,
            description: split.description || parentTransaction.description,
            amount: split.amount,
            type: parentTransaction.type,
            categoryId: split.categoryId !== undefined ? split.categoryId : parentTransaction.categoryId,
            grantId: split.grantId !== undefined ? split.grantId : parentTransaction.grantId,
            vendorId: parentTransaction.vendorId,
            clientId: parentTransaction.clientId,
            donorId: parentTransaction.donorId,
            fundId: split.fundId !== undefined ? split.fundId : parentTransaction.fundId,
            programId: split.programId !== undefined ? split.programId : parentTransaction.programId,
            functionalCategory: split.functionalCategory !== undefined ? split.functionalCategory : parentTransaction.functionalCategory,
            reconciliationStatus: 'unreconciled',
            source: parentTransaction.source,
            parentTransactionId: transactionId,
            isSplitChild: true,
            hasSplits: false,
            createdBy: userId,
          })
          .returning();
        createdSplits.push(childTransaction);
      }
      
      return createdSplits;
    });
  }

  async getTransactionSplits(parentTransactionId: number): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .where(eq(transactions.parentTransactionId, parentTransactionId))
      .orderBy(transactions.id);
  }

  async unsplitTransaction(parentTransactionId: number): Promise<Transaction> {
    return await db.transaction(async (tx) => {
      const [parentTransaction] = await tx
        .select()
        .from(transactions)
        .where(eq(transactions.id, parentTransactionId));
      
      if (!parentTransaction) {
        throw new Error('Transaction not found');
      }
      
      if (!parentTransaction.hasSplits) {
        throw new Error('Transaction is not split');
      }
      
      await tx
        .delete(transactions)
        .where(eq(transactions.parentTransactionId, parentTransactionId));
      
      const [restored] = await tx
        .update(transactions)
        .set({
          hasSplits: false,
          amount: parentTransaction.originalAmount || parentTransaction.amount,
          originalAmount: null,
          updatedAt: new Date(),
        })
        .where(eq(transactions.id, parentTransactionId))
        .returning();
      
      return restored;
    });
  }

  // Reconciliation operations
  async getUnreconciledTransactions(organizationId: number, plaidAccountId?: string): Promise<Transaction[]> {
    const conditions = [
      eq(transactions.organizationId, organizationId),
      eq(transactions.reconciliationStatus, 'unreconciled')
    ];
    
    if (plaidAccountId) {
      conditions.push(eq(transactions.plaidAccountId, plaidAccountId));
    }
    
    return await db
      .select()
      .from(transactions)
      .where(and(...conditions))
      .orderBy(desc(transactions.date));
  }

  async getReconciledTransactions(organizationId: number, limit: number = 100, offset: number = 0): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.organizationId, organizationId),
          eq(transactions.reconciliationStatus, 'reconciled')
        )
      )
      .orderBy(desc(transactions.date), desc(transactions.id))
      .limit(limit)
      .offset(offset);
  }

  async reconcileTransaction(id: number, userId: string): Promise<Transaction> {
    const [transaction] = await db
      .update(transactions)
      .set({
        reconciliationStatus: 'reconciled',
        reconciledDate: new Date(),
        reconciledBy: userId,
      })
      .where(eq(transactions.id, id))
      .returning();
    return transaction;
  }

  async unreconcileTransaction(id: number): Promise<Transaction> {
    const [transaction] = await db
      .update(transactions)
      .set({
        reconciliationStatus: 'unreconciled',
        reconciledDate: null,
        reconciledBy: null,
      })
      .where(eq(transactions.id, id))
      .returning();
    return transaction;
  }

  async bulkReconcileTransactions(ids: number[], userId: string): Promise<number> {
    const result = await db
      .update(transactions)
      .set({
        reconciliationStatus: 'reconciled',
        reconciledDate: new Date(),
        reconciledBy: userId,
      })
      .where(inArray(transactions.id, ids))
      .returning({ id: transactions.id });
    
    return result.length;
  }

  async autoReconcileTransactions(organizationId: number, userId: string): Promise<{ reconciledCount: number; matchedTransactions: Array<{ transactionId: number; plaidTransactionId: string }> }> {
    // Get all unreconciled transactions
    const unreconciledTxns = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.organizationId, organizationId),
          eq(transactions.reconciliationStatus, 'unreconciled')
        )
      );

    // Group by date and amount to find potential duplicates (Plaid import vs manual entry)
    const matchedTransactions: Array<{ transactionId: number; plaidTransactionId: string }> = [];
    const grouped = new Map<string, Transaction[]>();
    
    unreconciledTxns.forEach(txn => {
      const key = `${txn.date.toISOString().split('T')[0]}_${txn.amount}_${txn.type}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(txn);
    });

    // Find groups with exactly 2 transactions (likely duplicates)
    const idsToReconcile: number[] = [];
    grouped.forEach((txns, key) => {
      if (txns.length === 2) {
        // Both transactions are likely the same (one from Plaid, one manual)
        // Mark both as reconciled
        idsToReconcile.push(txns[0].id, txns[1].id);
        matchedTransactions.push({
          transactionId: txns[0].id,
          plaidTransactionId: txns[1].id.toString(),
        });
      }
    });

    // Reconcile the matched transactions
    if (idsToReconcile.length > 0) {
      await db
        .update(transactions)
        .set({
          reconciliationStatus: 'reconciled',
          reconciledDate: new Date(),
          reconciledBy: userId,
        })
        .where(inArray(transactions.id, idsToReconcile));
    }

    return {
      reconciledCount: idsToReconcile.length,
      matchedTransactions,
    };
  }

  // Bank Reconciliation Session operations
  async getBankReconciliations(organizationId: number): Promise<BankReconciliation[]> {
    return await db
      .select()
      .from(bankReconciliations)
      .where(eq(bankReconciliations.organizationId, organizationId))
      .orderBy(desc(bankReconciliations.statementEndDate));
  }

  async getBankReconciliation(id: number): Promise<BankReconciliation | undefined> {
    const [reconciliation] = await db
      .select()
      .from(bankReconciliations)
      .where(eq(bankReconciliations.id, id));
    return reconciliation;
  }

  async getLastBankReconciliation(organizationId: number, accountName?: string): Promise<BankReconciliation | undefined> {
    const conditions = [eq(bankReconciliations.organizationId, organizationId)];
    
    if (accountName) {
      conditions.push(eq(bankReconciliations.accountName, accountName));
    }
    
    const [reconciliation] = await db
      .select()
      .from(bankReconciliations)
      .where(and(...conditions))
      .orderBy(desc(bankReconciliations.statementEndDate))
      .limit(1);
    
    return reconciliation;
  }

  async createBankReconciliation(reconciliation: InsertBankReconciliation): Promise<BankReconciliation> {
    const [newReconciliation] = await db
      .insert(bankReconciliations)
      .values(reconciliation)
      .returning();
    return newReconciliation;
  }

  async updateBankReconciliation(id: number, updates: Partial<InsertBankReconciliation>): Promise<BankReconciliation> {
    const [updated] = await db
      .update(bankReconciliations)
      .set(updates)
      .where(eq(bankReconciliations.id, id))
      .returning();
    return updated;
  }

  async deleteBankReconciliation(id: number): Promise<void> {
    // First delete all related reconciliation matches
    await db
      .delete(reconciliationMatches)
      .where(eq(reconciliationMatches.reconciliationId, id));
    
    // Then delete all bank statement entries
    await db
      .delete(bankStatementEntries)
      .where(eq(bankStatementEntries.reconciliationId, id));
    
    // Finally delete the reconciliation itself
    await db
      .delete(bankReconciliations)
      .where(eq(bankReconciliations.id, id));
  }

  // Bank Statement Entry operations
  async getBankStatementEntry(id: number): Promise<BankStatementEntry | undefined> {
    const [entry] = await db
      .select()
      .from(bankStatementEntries)
      .where(eq(bankStatementEntries.id, id));
    return entry;
  }

  async getBankStatementEntries(reconciliationId: number): Promise<BankStatementEntry[]> {
    return await db
      .select()
      .from(bankStatementEntries)
      .where(eq(bankStatementEntries.reconciliationId, reconciliationId))
      .orderBy(bankStatementEntries.date);
  }

  async createBankStatementEntry(entry: InsertBankStatementEntry): Promise<BankStatementEntry> {
    const [newEntry] = await db
      .insert(bankStatementEntries)
      .values(entry)
      .returning();
    return newEntry;
  }

  async bulkCreateBankStatementEntries(entries: InsertBankStatementEntry[]): Promise<BankStatementEntry[]> {
    if (entries.length === 0) return [];
    return await db
      .insert(bankStatementEntries)
      .values(entries)
      .returning();
  }

  async updateBankStatementEntry(id: number, updates: Partial<InsertBankStatementEntry>): Promise<BankStatementEntry> {
    const [updated] = await db
      .update(bankStatementEntries)
      .set(updates)
      .where(eq(bankStatementEntries.id, id))
      .returning();
    return updated;
  }

  async deleteBankStatementEntry(id: number): Promise<void> {
    await db
      .delete(bankStatementEntries)
      .where(eq(bankStatementEntries.id, id));
  }

  // Reconciliation Match operations
  async getReconciliationMatches(reconciliationId: number): Promise<ReconciliationMatch[]> {
    return await db
      .select()
      .from(reconciliationMatches)
      .where(eq(reconciliationMatches.reconciliationId, reconciliationId))
      .orderBy(reconciliationMatches.matchedAt);
  }

  async matchTransactionToStatementEntry(
    reconciliationId: number,
    transactionId: number,
    statementEntryId: number,
    userId: string
  ): Promise<ReconciliationMatch> {
    return await db.transaction(async (tx) => {
      // Lock and validate transaction belongs to correct reconciliation
      const [transaction] = await tx
        .select()
        .from(transactions)
        .where(eq(transactions.id, transactionId))
        .for('update');

      if (!transaction) {
        throw new Error('Transaction not found');
      }

      // Lock and validate statement entry belongs to this reconciliation
      const [statementEntry] = await tx
        .select()
        .from(bankStatementEntries)
        .where(
          and(
            eq(bankStatementEntries.id, statementEntryId),
            eq(bankStatementEntries.reconciliationId, reconciliationId)
          )
        )
        .for('update');

      if (!statementEntry) {
        throw new Error('Statement entry not found or does not belong to this reconciliation');
      }

      // Check if already matched - return existing match instead of throwing error
      if (transaction.reconciliationStatus === 'reconciled') {
        // Find existing match for this transaction
        const [existingMatch] = await tx
          .select()
          .from(reconciliationMatches)
          .where(eq(reconciliationMatches.transactionId, transactionId))
          .limit(1);
        
        if (existingMatch) {
          return existingMatch;
        }
        // If no match exists but transaction is reconciled, just return a placeholder
        throw new Error('Transaction is already reconciled');
      }

      if (statementEntry.isMatched === 1) {
        // Find existing match for this statement entry
        const [existingMatch] = await tx
          .select()
          .from(reconciliationMatches)
          .where(eq(reconciliationMatches.statementEntryId, statementEntryId))
          .limit(1);
        
        if (existingMatch) {
          return existingMatch;
        }
        throw new Error('Statement entry is already matched');
      }

      // Create the match
      const [match] = await tx
        .insert(reconciliationMatches)
        .values({
          reconciliationId,
          transactionId,
          statementEntryId,
          matchedBy: userId,
          matchedAt: new Date(),
        })
        .returning();

      // Update transaction status
      await tx
        .update(transactions)
        .set({
          reconciliationStatus: 'reconciled',
          reconciledDate: new Date(),
          reconciledBy: userId,
        })
        .where(eq(transactions.id, transactionId));

      // Update statement entry status
      await tx
        .update(bankStatementEntries)
        .set({
          isMatched: 1,
        })
        .where(eq(bankStatementEntries.id, statementEntryId));

      return { match, transaction, statementEntry };
    });

    // Audit log with proper chain hash (outside transaction to use createAuditLog)
    await this.createAuditLog({
      organizationId: result.transaction.organizationId,
      userId,
      action: 'create',
      entityType: 'reconciliation_match',
      entityId: transactionId,
      details: JSON.stringify({
        reconciliationId,
        statementEntryId,
        transactionDescription: result.transaction.description,
        statementDescription: result.statementEntry.description,
        amount: result.transaction.amount,
      }),
      timestamp: new Date(),
      ipAddress: '',
    });

    return result.match;
  }

  async unmatchTransaction(matchId: number): Promise<void> {
    await db.transaction(async (tx) => {
      // Lock and get the match
      const [match] = await tx
        .select()
        .from(reconciliationMatches)
        .where(eq(reconciliationMatches.id, matchId))
        .for('update');

      if (!match) {
        throw new Error('Match not found');
      }

      // Update transaction status if exists
      if (match.transactionId) {
        await tx
          .update(transactions)
          .set({
            reconciliationStatus: 'unreconciled',
            reconciledDate: null,
            reconciledBy: null,
          })
          .where(eq(transactions.id, match.transactionId));
      }

      // Update statement entry status if exists
      if (match.statementEntryId) {
        await tx
          .update(bankStatementEntries)
          .set({
            isMatched: 0,
          })
          .where(eq(bankStatementEntries.id, match.statementEntryId));
      }

      // Delete the match
      await tx
        .delete(reconciliationMatches)
        .where(eq(reconciliationMatches.id, matchId));

      // Get transaction for audit log
      const transaction = match.transactionId 
        ? (await tx.select().from(transactions).where(eq(transactions.id, match.transactionId)))[0]
        : null;

      return { match, transaction };
    });

    // Audit log with proper chain hash (outside transaction to use createAuditLog)
    if (result.transaction) {
      await this.createAuditLog({
        organizationId: result.transaction.organizationId,
        userId: result.match.matchedBy || 'system',
        action: 'delete',
        entityType: 'reconciliation_match',
        entityId: result.match.transactionId!.toString(),
        details: JSON.stringify({
          reconciliationId: result.match.reconciliationId,
          statementEntryId: result.match.statementEntryId,
        }),
        timestamp: new Date(),
        ipAddress: '',
      });
    }
  }

  async bulkDeleteMatches(matchIds: number[]): Promise<number> {
    if (matchIds.length === 0) return 0;

    return await db.transaction(async (tx) => {
      // Get all matches
      const matches = await tx
        .select()
        .from(reconciliationMatches)
        .where(inArray(reconciliationMatches.id, matchIds));

      // Update all transactions
      const transactionIds = matches
        .map(m => m.transactionId)
        .filter(id => id !== null) as number[];

      if (transactionIds.length > 0) {
        await tx
          .update(transactions)
          .set({
            reconciliationStatus: 'unreconciled',
            reconciledDate: null,
            reconciledBy: null,
          })
          .where(inArray(transactions.id, transactionIds));
      }

      // Update all statement entries
      const entryIds = matches
        .map(m => m.statementEntryId)
        .filter(id => id !== null) as number[];

      if (entryIds.length > 0) {
        await tx
          .update(bankStatementEntries)
          .set({
            isMatched: 0,
          })
          .where(inArray(bankStatementEntries.id, entryIds));
      }

      // Delete all matches
      await tx
        .delete(reconciliationMatches)
        .where(inArray(reconciliationMatches.id, matchIds));

      return matches.length;
    });
  }

  async getSuggestedMatches(reconciliationId: number): Promise<Array<{
    transaction: Transaction;
    statementEntry: BankStatementEntry;
    similarityScore: number;
  }>> {
    // Get reconciliation to find date range
    const reconciliation = await this.getBankReconciliation(reconciliationId);
    if (!reconciliation) return [];

    // Get unmatched transactions in date range
    const unmatchedTransactions = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.organizationId, reconciliation.organizationId),
          eq(transactions.reconciliationStatus, 'unreconciled'),
          gte(transactions.date, reconciliation.statementStartDate || new Date(0)),
          lte(transactions.date, reconciliation.statementEndDate)
        )
      );

    // Get unmatched statement entries
    const unmatchedEntries = await db
      .select()
      .from(bankStatementEntries)
      .where(
        and(
          eq(bankStatementEntries.reconciliationId, reconciliationId),
          eq(bankStatementEntries.isMatched, 0)
        )
      );

    // Calculate similarity scores
    const suggestions: Array<{
      transaction: Transaction;
      statementEntry: BankStatementEntry;
      similarityScore: number;
    }> = [];

    for (const txn of unmatchedTransactions) {
      for (const entry of unmatchedEntries) {
        let score = 0;

        // Amount match (highest weight)
        const txnAmount = Math.abs(parseFloat(txn.amount));
        const entryAmount = Math.abs(parseFloat(entry.amount));
        const amountDiff = Math.abs(txnAmount - entryAmount);
        
        if (amountDiff < 0.01) {
          score += 50; // Exact match
        } else if (amountDiff < 1) {
          score += 40; // Very close
        } else if (amountDiff < 10) {
          score += 20; // Close
        }

        // Date proximity (medium weight)
        const dateDiff = Math.abs(
          new Date(txn.date).getTime() - new Date(entry.date).getTime()
        ) / (1000 * 60 * 60 * 24); // days

        if (dateDiff === 0) {
          score += 30; // Same day
        } else if (dateDiff <= 3) {
          score += 20; // Within 3 days
        } else if (dateDiff <= 7) {
          score += 10; // Within a week
        }

        // Description similarity (lower weight)
        const txnDesc = txn.description.toLowerCase();
        const entryDesc = entry.description.toLowerCase();
        
        if (txnDesc === entryDesc) {
          score += 20; // Exact match
        } else if (txnDesc.includes(entryDesc) || entryDesc.includes(txnDesc)) {
          score += 15; // Substring match
        } else {
          // Token overlap
          const txnTokens = new Set(txnDesc.split(/\s+/));
          const entryTokens = new Set(entryDesc.split(/\s+/));
          const commonTokens = [...txnTokens].filter(t => entryTokens.has(t));
          if (commonTokens.length > 0) {
            score += Math.min(10, commonTokens.length * 3);
          }
        }

        // Only suggest if score is meaningful (>= 60%)
        if (score >= 60) {
          suggestions.push({ transaction: txn, statementEntry: entry, similarityScore: score });
        }
      }
    }

    // Return top matches, ordered by score
    return suggestions
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, 20); // Limit to top 20 suggestions
  }

  async getMatchedTransactionIds(organizationId: number): Promise<number[]> {
    // Get all active reconciliations for this organization (status = 'unreconciled' means in progress)
    const activeReconciliations = await db
      .select({ id: bankReconciliations.id })
      .from(bankReconciliations)
      .where(
        and(
          eq(bankReconciliations.organizationId, organizationId),
          eq(bankReconciliations.status, 'unreconciled')
        )
      );

    if (activeReconciliations.length === 0) {
      return [];
    }

    const reconciliationIds = activeReconciliations.map(r => r.id);

    // Get all matched transaction IDs for these reconciliations
    const matches = await db
      .select({ transactionId: reconciliationMatches.transactionId })
      .from(reconciliationMatches)
      .where(inArray(reconciliationMatches.reconciliationId, reconciliationIds));

    return matches.map(m => m.transactionId);
  }

  // Grant operations
  async getGrants(organizationId: number): Promise<Array<Grant & { totalSpent: string; totalIncome: string; remainingBalance: string }>> {
    const grantsData = await db
      .select()
      .from(grants)
      .where(eq(grants.organizationId, organizationId))
      .orderBy(desc(grants.createdAt));

    // Calculate spent and income amount for each grant
    const grantsWithBalances = await Promise.all(
      grantsData.map(async (grant) => {
        const [expenseResult] = await db
          .select({
            totalSpent: sql<string>`COALESCE(SUM(ABS(${transactions.amount})), 0)`,
          })
          .from(transactions)
          .where(
            and(
              eq(transactions.grantId, grant.id),
              eq(transactions.type, 'expense')
            )
          );

        const [incomeResult] = await db
          .select({
            totalIncome: sql<string>`COALESCE(SUM(ABS(${transactions.amount})), 0)`,
          })
          .from(transactions)
          .where(
            and(
              eq(transactions.grantId, grant.id),
              eq(transactions.type, 'income')
            )
          );

        const grantAmount = parseFloat(grant.amount) || 0;
        const totalIncome = parseFloat(incomeResult?.totalIncome || '0');
        const totalSpent = parseFloat(expenseResult?.totalSpent || '0');
        // Remaining balance = grant amount + additional income - expenses
        // Clamped to 0 to prevent negative display, but raw values are also available
        const remainingBalance = grantAmount + totalIncome - totalSpent;

        return {
          ...grant,
          totalSpent: expenseResult?.totalSpent || '0',
          totalIncome: incomeResult?.totalIncome || '0',
          remainingBalance: remainingBalance.toFixed(2),
        };
      })
    );

    return grantsWithBalances;
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

  async getBudgetItem(id: number): Promise<BudgetItem | null> {
    const [item] = await db
      .select()
      .from(budgetItems)
      .where(eq(budgetItems.id, id));
    return item || null;
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

  async getBudgetIncomeItems(budgetId: number): Promise<BudgetIncomeItem[]> {
    return await db
      .select()
      .from(budgetIncomeItems)
      .where(eq(budgetIncomeItems.budgetId, budgetId))
      .orderBy(budgetIncomeItems.createdAt);
  }

  async createBudgetIncomeItem(itemData: InsertBudgetIncomeItem): Promise<BudgetIncomeItem> {
    const [item] = await db
      .insert(budgetIncomeItems)
      .values(itemData)
      .returning();
    return item;
  }

  async updateBudgetIncomeItem(id: number, updates: Partial<InsertBudgetIncomeItem>): Promise<BudgetIncomeItem> {
    const [item] = await db
      .update(budgetIncomeItems)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(budgetIncomeItems.id, id))
      .returning();
    return item;
  }

  async deleteBudgetIncomeItem(id: number): Promise<void> {
    await db.delete(budgetIncomeItems).where(eq(budgetIncomeItems.id, id));
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
    // Include organizationId filter for proper data isolation
    const results = [];
    for (const item of items) {
      const [actualResult] = await db
        .select({
          total: sql<string>`COALESCE(SUM(${transactions.amount}), 0)`,
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.organizationId, budget.organizationId),
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

  // Budget Alert operations
  async getBudgetAlerts(budgetId: number): Promise<BudgetAlert[]> {
    return await db
      .select()
      .from(budgetAlerts)
      .where(eq(budgetAlerts.budgetId, budgetId))
      .orderBy(desc(budgetAlerts.sentAt));
  }

  async getRecentBudgetAlerts(budgetId: number, alertType: string): Promise<BudgetAlert | null> {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [alert] = await db
      .select()
      .from(budgetAlerts)
      .where(
        and(
          eq(budgetAlerts.budgetId, budgetId),
          eq(budgetAlerts.alertType, alertType as any),
          gte(budgetAlerts.sentAt, oneDayAgo)
        )
      )
      .orderBy(desc(budgetAlerts.sentAt))
      .limit(1);
    return alert || null;
  }

  async createBudgetAlert(alert: InsertBudgetAlert): Promise<BudgetAlert> {
    const [created] = await db.insert(budgetAlerts).values(alert).returning();
    return created;
  }

  async acknowledgeBudgetAlert(id: number, userId: string): Promise<BudgetAlert> {
    const [updated] = await db
      .update(budgetAlerts)
      .set({ 
        acknowledged: true, 
        acknowledgedAt: new Date(), 
        acknowledgedBy: userId 
      })
      .where(eq(budgetAlerts.id, id))
      .returning();
    return updated;
  }

  async checkAndSendBudgetAlerts(organizationId: number): Promise<{ alertsSent: number; budgetsChecked: number }> {
    const orgBudgets = await this.getBudgets(organizationId);
    let alertsSent = 0;
    const budgetsChecked = orgBudgets.length;

    for (const budget of orgBudgets) {
      const now = new Date();
      const startDate = new Date(budget.startDate);
      const endDate = new Date(budget.endDate);
      
      if (now < startDate || now > endDate) continue;

      const budgetVsActual = await this.getBudgetVsActual(budget.id);
      const totalBudgeted = budgetVsActual.reduce((sum, item) => sum + parseFloat(item.budgeted), 0);
      const totalActual = budgetVsActual.reduce((sum, item) => sum + parseFloat(item.actual), 0);
      
      if (totalBudgeted === 0) continue;

      const percentUsed = (totalActual / totalBudgeted) * 100;
      
      const elapsedDays = Math.max(1, (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const remainingDays = Math.max(0, (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const dailyBurnRate = totalActual / elapsedDays;
      const projectedEndSpend = totalActual + (dailyBurnRate * remainingDays);
      const projectedOverage = projectedEndSpend > totalBudgeted ? projectedEndSpend - totalBudgeted : 0;

      const alertsToCheck: Array<{type: string; threshold: number; enabled: boolean}> = [
        { type: 'threshold_50', threshold: 50, enabled: budget.alertAt50 ?? false },
        { type: 'threshold_75', threshold: 75, enabled: budget.alertAt75 ?? true },
        { type: 'threshold_90', threshold: 90, enabled: budget.alertAt90 ?? true },
        { type: 'over_budget', threshold: 100, enabled: true },
      ];

      if (projectedOverage > 0 && percentUsed < 100) {
        alertsToCheck.push({ type: 'burn_rate', threshold: 0, enabled: true });
      }

      for (const alertConfig of alertsToCheck) {
        if (!alertConfig.enabled) continue;
        if (alertConfig.type !== 'burn_rate' && percentUsed < alertConfig.threshold) continue;

        const recentAlert = await this.getRecentBudgetAlerts(budget.id, alertConfig.type);
        if (recentAlert) continue;

        const org = await this.getOrganization(organizationId);
        const ownerRole = await this.getOrganizationOwner(organizationId);
        if (!ownerRole || !org) continue;

        const owner = await this.getUser(ownerRole.userId);
        if (!owner?.email) continue;

        await this.createBudgetAlert({
          budgetId: budget.id,
          alertType: alertConfig.type as any,
          percentUsed: percentUsed.toString(),
          projectedOverage: projectedOverage > 0 ? projectedOverage.toString() : null,
          sentTo: owner.email,
        });
        alertsSent++;
      }
    }

    return { alertsSent, budgetsChecked };
  }

  // Program-level budget operations with roll-up
  async getProgramBudgetSummary(organizationId: number): Promise<Array<{
    programId: number | null;
    programName: string;
    budgetCount: number;
    totalBudgeted: string;
    totalActual: string;
    variance: string;
    percentUsed: number;
    status: 'under_budget' | 'on_track' | 'over_budget';
  }>> {
    const allBudgets = await this.getBudgets(organizationId);
    const allPrograms = await this.getPrograms(organizationId);
    const programMap = new Map(allPrograms.map(p => [p.id, p.name]));

    const programSummaries = new Map<number | null, {
      budgetCount: number;
      totalBudgeted: number;
      totalActual: number;
    }>();

    for (const budget of allBudgets) {
      const programId = budget.programId;
      const budgetVsActual = await this.getBudgetVsActual(budget.id);
      const totalBudgeted = budgetVsActual.reduce((sum, item) => sum + parseFloat(item.budgeted), 0);
      const totalActual = budgetVsActual.reduce((sum, item) => sum + parseFloat(item.actual), 0);

      const existing = programSummaries.get(programId) || { budgetCount: 0, totalBudgeted: 0, totalActual: 0 };
      programSummaries.set(programId, {
        budgetCount: existing.budgetCount + 1,
        totalBudgeted: existing.totalBudgeted + totalBudgeted,
        totalActual: existing.totalActual + totalActual,
      });
    }

    const results: Array<{
      programId: number | null;
      programName: string;
      budgetCount: number;
      totalBudgeted: string;
      totalActual: string;
      variance: string;
      percentUsed: number;
      status: 'under_budget' | 'on_track' | 'over_budget';
    }> = [];

    for (const [programId, data] of programSummaries.entries()) {
      const variance = data.totalBudgeted - data.totalActual;
      const percentUsed = data.totalBudgeted > 0 ? (data.totalActual / data.totalBudgeted) * 100 : 0;
      
      let status: 'under_budget' | 'on_track' | 'over_budget';
      if (percentUsed > 100) {
        status = 'over_budget';
      } else if (percentUsed >= 80) {
        status = 'on_track';
      } else {
        status = 'under_budget';
      }

      results.push({
        programId,
        programName: programId ? (programMap.get(programId) || 'Unknown Program') : 'Unassigned',
        budgetCount: data.budgetCount,
        totalBudgeted: data.totalBudgeted.toFixed(2),
        totalActual: data.totalActual.toFixed(2),
        variance: variance.toFixed(2),
        percentUsed: Math.round(percentUsed * 10) / 10,
        status,
      });
    }

    return results.sort((a, b) => parseFloat(b.totalBudgeted) - parseFloat(a.totalBudgeted));
  }

  async getOrganizationBudgetRollup(organizationId: number): Promise<{
    totalBudgeted: string;
    totalActual: string;
    variance: string;
    percentUsed: number;
    programBreakdown: Array<{
      programId: number | null;
      programName: string;
      budgeted: string;
      actual: string;
      percentOfTotal: number;
    }>;
  }> {
    const programSummary = await this.getProgramBudgetSummary(organizationId);
    
    const totalBudgeted = programSummary.reduce((sum, p) => sum + parseFloat(p.totalBudgeted), 0);
    const totalActual = programSummary.reduce((sum, p) => sum + parseFloat(p.totalActual), 0);
    const variance = totalBudgeted - totalActual;
    const percentUsed = totalBudgeted > 0 ? (totalActual / totalBudgeted) * 100 : 0;

    const programBreakdown = programSummary.map(p => ({
      programId: p.programId,
      programName: p.programName,
      budgeted: p.totalBudgeted,
      actual: p.totalActual,
      percentOfTotal: totalBudgeted > 0 ? (parseFloat(p.totalBudgeted) / totalBudgeted) * 100 : 0,
    }));

    return {
      totalBudgeted: totalBudgeted.toFixed(2),
      totalActual: totalActual.toFixed(2),
      variance: variance.toFixed(2),
      percentUsed: Math.round(percentUsed * 10) / 10,
      programBreakdown,
    };
  }

  // Multi-year budget operations
  async getMultiYearBudgetSummary(organizationId: number, years?: number[]): Promise<Array<{
    year: number;
    fiscalYear: string;
    totalBudgeted: string;
    totalActual: string;
    variance: string;
    percentUsed: number;
    budgetCount: number;
  }>> {
    const org = await this.getOrganization(organizationId);
    const fiscalYearStartMonth = org?.fiscalYearStartMonth || 1;
    
    const allBudgets = await this.getBudgets(organizationId);
    const yearSummaries = new Map<number, {
      totalBudgeted: number;
      totalActual: number;
      budgetCount: number;
    }>();

    for (const budget of allBudgets) {
      const startDate = new Date(budget.startDate);
      let fiscalYear = startDate.getFullYear();
      if (fiscalYearStartMonth > 1 && startDate.getMonth() + 1 >= fiscalYearStartMonth) {
        fiscalYear += 1;
      }

      if (years && !years.includes(fiscalYear)) continue;

      const budgetVsActual = await this.getBudgetVsActual(budget.id);
      const totalBudgeted = budgetVsActual.reduce((sum, item) => sum + parseFloat(item.budgeted), 0);
      const totalActual = budgetVsActual.reduce((sum, item) => sum + parseFloat(item.actual), 0);

      const existing = yearSummaries.get(fiscalYear) || { totalBudgeted: 0, totalActual: 0, budgetCount: 0 };
      yearSummaries.set(fiscalYear, {
        totalBudgeted: existing.totalBudgeted + totalBudgeted,
        totalActual: existing.totalActual + totalActual,
        budgetCount: existing.budgetCount + 1,
      });
    }

    const results: Array<{
      year: number;
      fiscalYear: string;
      totalBudgeted: string;
      totalActual: string;
      variance: string;
      percentUsed: number;
      budgetCount: number;
    }> = [];

    for (const [year, data] of yearSummaries.entries()) {
      const variance = data.totalBudgeted - data.totalActual;
      const percentUsed = data.totalBudgeted > 0 ? (data.totalActual / data.totalBudgeted) * 100 : 0;
      
      const fyLabel = fiscalYearStartMonth === 1 
        ? `${year}` 
        : `FY${year} (${fiscalYearStartMonth > 6 ? year - 1 : year}/${fiscalYearStartMonth > 6 ? year : year + 1})`;

      results.push({
        year,
        fiscalYear: fyLabel,
        totalBudgeted: data.totalBudgeted.toFixed(2),
        totalActual: data.totalActual.toFixed(2),
        variance: variance.toFixed(2),
        percentUsed: Math.round(percentUsed * 10) / 10,
        budgetCount: data.budgetCount,
      });
    }

    return results.sort((a, b) => b.year - a.year);
  }

  async getBudgetsByFiscalYear(organizationId: number, fiscalYear: string): Promise<Budget[]> {
    const org = await this.getOrganization(organizationId);
    const fiscalYearStartMonth = org?.fiscalYearStartMonth || 1;
    const fyNumber = parseInt(fiscalYear.replace(/\D/g, ''));
    
    let startDate: Date;
    let endDate: Date;
    
    if (fiscalYearStartMonth === 1) {
      startDate = new Date(fyNumber, 0, 1);
      endDate = new Date(fyNumber, 11, 31, 23, 59, 59);
    } else {
      startDate = new Date(fyNumber - 1, fiscalYearStartMonth - 1, 1);
      endDate = new Date(fyNumber, fiscalYearStartMonth - 1, 0, 23, 59, 59);
    }

    return await db
      .select()
      .from(budgets)
      .where(
        and(
          eq(budgets.organizationId, organizationId),
          gte(budgets.startDate, startDate),
          lte(budgets.endDate, endDate)
        )
      )
      .orderBy(desc(budgets.startDate));
  }

  async getRollingForecast(organizationId: number, months: number = 12): Promise<Array<{
    month: string;
    projectedIncome: string;
    projectedExpenses: string;
    projectedBalance: string;
    isHistorical: boolean;
  }>> {
    const now = new Date();
    const results: Array<{
      month: string;
      projectedIncome: string;
      projectedExpenses: string;
      projectedBalance: string;
      isHistorical: boolean;
    }> = [];

    const historicalMonths = 6;
    let runningBalance = 0;

    for (let i = -historicalMonths; i <= months; i++) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const monthStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
      const monthEnd = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59);

      const isHistorical = i < 0;
      const monthLabel = targetDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });

      if (isHistorical || i === 0) {
        const [incomeResult] = await db
          .select({ total: sql<string>`COALESCE(SUM(${transactions.amount}), 0)` })
          .from(transactions)
          .where(and(
            eq(transactions.organizationId, organizationId),
            eq(transactions.type, 'income'),
            gte(transactions.date, monthStart),
            lte(transactions.date, monthEnd)
          ));

        const [expenseResult] = await db
          .select({ total: sql<string>`COALESCE(SUM(${transactions.amount}), 0)` })
          .from(transactions)
          .where(and(
            eq(transactions.organizationId, organizationId),
            eq(transactions.type, 'expense'),
            gte(transactions.date, monthStart),
            lte(transactions.date, monthEnd)
          ));

        const income = parseFloat(incomeResult?.total || '0');
        const expenses = parseFloat(expenseResult?.total || '0');
        runningBalance += income - expenses;

        results.push({
          month: monthLabel,
          projectedIncome: income.toFixed(2),
          projectedExpenses: expenses.toFixed(2),
          projectedBalance: runningBalance.toFixed(2),
          isHistorical: true,
        });
      } else {
        const avgIncome = results.length > 0 
          ? results.filter(r => r.isHistorical).reduce((sum, r) => sum + parseFloat(r.projectedIncome), 0) / historicalMonths
          : 0;
        const avgExpenses = results.length > 0 
          ? results.filter(r => r.isHistorical).reduce((sum, r) => sum + parseFloat(r.projectedExpenses), 0) / historicalMonths
          : 0;

        runningBalance += avgIncome - avgExpenses;

        results.push({
          month: monthLabel,
          projectedIncome: avgIncome.toFixed(2),
          projectedExpenses: avgExpenses.toFixed(2),
          projectedBalance: runningBalance.toFixed(2),
          isHistorical: false,
        });
      }
    }

    return results;
  }

  // Enhanced cash flow operations
  async generateCashFlowProjection(scenarioId: number): Promise<Array<{
    month: string;
    projectedIncome: string;
    projectedExpenses: string;
    projectedBalance: string;
    seasonalFactor: number;
    notes: string;
  }>> {
    const [scenario] = await db.select().from(cashFlowScenarios).where(eq(cashFlowScenarios.id, scenarioId));
    if (!scenario) {
      throw new Error('Scenario not found');
    }

    const seasonalAdjustments = (scenario.seasonalAdjustments as Record<string, number>) || {};
    const defaultSeasonalFactors: Record<string, number> = {
      '1': 0.8, '2': 0.9, '3': 1.0, '4': 1.0, '5': 1.0, '6': 0.9,
      '7': 0.85, '8': 0.85, '9': 1.0, '10': 1.1, '11': 1.2, '12': 1.3
    };

    const incomeGrowthRate = parseFloat(scenario.incomeGrowthRate || '0') / 100;
    const expenseGrowthRate = parseFloat(scenario.expenseGrowthRate || '0') / 100;

    const historicalIncome = await db
      .select({ total: sql<string>`COALESCE(SUM(${transactions.amount}), 0)`, month: sql<string>`TO_CHAR(${transactions.date}, 'YYYY-MM')` })
      .from(transactions)
      .where(and(
        eq(transactions.organizationId, scenario.organizationId),
        eq(transactions.type, 'income'),
        gte(transactions.date, new Date(Date.now() - 365 * 24 * 60 * 60 * 1000))
      ))
      .groupBy(sql`TO_CHAR(${transactions.date}, 'YYYY-MM')`);

    const historicalExpenses = await db
      .select({ total: sql<string>`COALESCE(SUM(${transactions.amount}), 0)`, month: sql<string>`TO_CHAR(${transactions.date}, 'YYYY-MM')` })
      .from(transactions)
      .where(and(
        eq(transactions.organizationId, scenario.organizationId),
        eq(transactions.type, 'expense'),
        gte(transactions.date, new Date(Date.now() - 365 * 24 * 60 * 60 * 1000))
      ))
      .groupBy(sql`TO_CHAR(${transactions.date}, 'YYYY-MM')`);

    const avgMonthlyIncome = historicalIncome.length > 0 
      ? historicalIncome.reduce((sum, r) => sum + parseFloat(r.total), 0) / historicalIncome.length
      : 0;
    const avgMonthlyExpenses = historicalExpenses.length > 0
      ? historicalExpenses.reduce((sum, r) => sum + parseFloat(r.total), 0) / historicalExpenses.length
      : 0;

    const results: Array<{
      month: string;
      projectedIncome: string;
      projectedExpenses: string;
      projectedBalance: string;
      seasonalFactor: number;
      notes: string;
    }> = [];

    const startDate = new Date(scenario.startDate);
    const endDate = new Date(scenario.endDate);
    let runningBalance = 0;
    let monthIndex = 0;

    for (let d = new Date(startDate); d <= endDate; d.setMonth(d.getMonth() + 1)) {
      const monthNum = (d.getMonth() + 1).toString();
      const seasonalFactor = seasonalAdjustments[monthNum] || defaultSeasonalFactors[monthNum] || 1;
      const growthFactor = Math.pow(1 + incomeGrowthRate, monthIndex / 12);
      const expenseGrowthFactor = Math.pow(1 + expenseGrowthRate, monthIndex / 12);

      const projectedIncome = avgMonthlyIncome * seasonalFactor * growthFactor;
      const projectedExpenses = avgMonthlyExpenses * expenseGrowthFactor;
      runningBalance += projectedIncome - projectedExpenses;

      const monthLabel = d.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      const notes = seasonalFactor !== 1 
        ? `Seasonal adjustment: ${(seasonalFactor * 100).toFixed(0)}%` 
        : '';

      results.push({
        month: monthLabel,
        projectedIncome: projectedIncome.toFixed(2),
        projectedExpenses: projectedExpenses.toFixed(2),
        projectedBalance: runningBalance.toFixed(2),
        seasonalFactor,
        notes,
      });

      monthIndex++;
    }

    return results;
  }

  async exportCashFlowProjections(organizationId: number, scenarioId?: number, format: 'csv' | 'json' = 'csv'): Promise<string> {
    let projections: Array<{
      month: string;
      projectedIncome: string;
      projectedExpenses: string;
      projectedBalance: string;
      seasonalFactor: number;
      notes: string;
    }> = [];

    if (scenarioId) {
      projections = await this.generateCashFlowProjection(scenarioId);
    } else {
      const scenarios = await db.select().from(cashFlowScenarios).where(eq(cashFlowScenarios.organizationId, organizationId)).limit(1);
      if (scenarios.length > 0) {
        projections = await this.generateCashFlowProjection(scenarios[0].id);
      }
    }

    if (format === 'json') {
      return JSON.stringify(projections, null, 2);
    }

    const headers = ['Month', 'Projected Income', 'Projected Expenses', 'Projected Balance', 'Seasonal Factor', 'Notes'];
    const rows = projections.map(p => [
      p.month,
      p.projectedIncome,
      p.projectedExpenses,
      p.projectedBalance,
      p.seasonalFactor.toString(),
      `"${p.notes}"`
    ].join(','));

    return [headers.join(','), ...rows].join('\n');
  }

  // Reconciliation Audit Log operations
  async recordReconciliationAction(log: InsertReconciliationAuditLog): Promise<ReconciliationAuditLog> {
    const [created] = await db.insert(reconciliationAuditLogs).values(log).returning();
    return created;
  }

  async getReconciliationAuditLogs(
    organizationId: number,
    filters?: {
      transactionId?: number;
      bankAccountId?: number;
      action?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    }
  ): Promise<ReconciliationAuditLog[]> {
    const conditions = [eq(reconciliationAuditLogs.organizationId, organizationId)];
    
    if (filters?.transactionId) {
      conditions.push(eq(reconciliationAuditLogs.transactionId, filters.transactionId));
    }
    if (filters?.bankAccountId) {
      conditions.push(eq(reconciliationAuditLogs.bankAccountId, filters.bankAccountId));
    }
    if (filters?.action) {
      conditions.push(eq(reconciliationAuditLogs.action, filters.action as any));
    }
    if (filters?.startDate) {
      conditions.push(gte(reconciliationAuditLogs.performedAt, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(reconciliationAuditLogs.performedAt, filters.endDate));
    }

    const query = db
      .select()
      .from(reconciliationAuditLogs)
      .where(and(...conditions))
      .orderBy(desc(reconciliationAuditLogs.performedAt));

    if (filters?.limit) {
      return query.limit(filters.limit);
    }
    return query;
  }

  async exportReconciliationAuditLogs(organizationId: number, format: 'csv' | 'json' = 'csv'): Promise<string> {
    const logs = await this.getReconciliationAuditLogs(organizationId);
    
    if (format === 'json') {
      return JSON.stringify(logs, null, 2);
    }

    const headers = ['ID', 'Transaction ID', 'Bank Account ID', 'Action', 'Previous Status', 'New Status', 'Previous Balance', 'New Balance', 'Difference', 'Notes', 'Performed By', 'Performed At', 'IP Address'];
    const rows = logs.map(log => [
      log.id,
      log.transactionId || '',
      log.bankAccountId || '',
      log.action,
      log.previousStatus || '',
      log.newStatus || '',
      log.previousBalance || '',
      log.newBalance || '',
      log.difference || '',
      `"${(log.notes || '').replace(/"/g, '""')}"`,
      log.performedBy,
      log.performedAt.toISOString(),
      log.ipAddress || ''
    ].join(','));

    return [headers.join(','), ...rows].join('\n');
  }

  // Reconciliation Alert operations
  async checkAndSendReconciliationAlerts(organizationId: number): Promise<{ alertsSent: number }> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    let alertsSent = 0;

    // Check for stale unreconciled items (>30 days)
    const staleTransactions = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.organizationId, organizationId),
          or(
            eq(transactions.reconciliationStatus, 'pending'),
            isNull(transactions.reconciliationStatus)
          ),
          lt(transactions.createdAt, thirtyDaysAgo)
        )
      );

    for (const tx of staleTransactions) {
      const daysSince = Math.floor((Date.now() - tx.createdAt.getTime()) / (1000 * 60 * 60 * 24));
      
      // Check if we already sent an alert for this transaction recently
      const existing = await db
        .select()
        .from(reconciliationAlerts)
        .where(
          and(
            eq(reconciliationAlerts.transactionId, tx.id),
            eq(reconciliationAlerts.alertType, 'stale_unreconciled'),
            gte(reconciliationAlerts.sentAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) // Within last 7 days
          )
        )
        .limit(1);

      if (existing.length === 0) {
        await db.insert(reconciliationAlerts).values({
          organizationId,
          transactionId: tx.id,
          alertType: 'stale_unreconciled',
          daysSinceCreation: daysSince,
          description: `Transaction "${tx.description}" has been unreconciled for ${daysSince} days`,
          sentTo: 'owner',
        });
        alertsSent++;
      }
    }

    return { alertsSent };
  }

  async getReconciliationAlerts(organizationId: number, acknowledged?: boolean): Promise<ReconciliationAlert[]> {
    const conditions = [eq(reconciliationAlerts.organizationId, organizationId)];
    
    if (acknowledged !== undefined) {
      conditions.push(eq(reconciliationAlerts.acknowledged, acknowledged));
    }

    return db
      .select()
      .from(reconciliationAlerts)
      .where(and(...conditions))
      .orderBy(desc(reconciliationAlerts.sentAt));
  }

  async acknowledgeReconciliationAlert(id: number, userId: string): Promise<ReconciliationAlert> {
    const [updated] = await db
      .update(reconciliationAlerts)
      .set({
        acknowledged: true,
        acknowledgedAt: new Date(),
        acknowledgedBy: userId,
      })
      .where(eq(reconciliationAlerts.id, id))
      .returning();
    return updated;
  }

  async getStaleUnreconciledCount(organizationId: number, daysSinceThreshold: number = 30): Promise<number> {
    const thresholdDate = new Date(Date.now() - daysSinceThreshold * 24 * 60 * 60 * 1000);
    
    const [result] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(transactions)
      .where(
        and(
          eq(transactions.organizationId, organizationId),
          or(
            eq(transactions.reconciliationStatus, 'pending'),
            isNull(transactions.reconciliationStatus)
          ),
          lt(transactions.createdAt, thresholdDate)
        )
      );

    return result?.count || 0;
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

  async getMonthlyTrends(organizationId: number, months: number = 6): Promise<Array<{
    month: string;
    income: string;
    expenses: string;
    netIncome: string;
  }>> {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);
    
    // Single optimized query that aggregates all months at once
    const monthlyData = await db
      .select({
        yearMonth: sql<string>`TO_CHAR(${transactions.date}, 'YYYY-MM')`,
        type: transactions.type,
        total: sql<string>`COALESCE(SUM(${transactions.amount}), 0)`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.organizationId, organizationId),
          gte(transactions.date, startDate),
          sql`${transactions.type} IN ('income', 'expense')`
        )
      )
      .groupBy(sql`TO_CHAR(${transactions.date}, 'YYYY-MM')`, transactions.type);
    
    // Build a map for quick lookup
    const dataMap = new Map<string, { income: string; expenses: string }>();
    for (const row of monthlyData) {
      const key = row.yearMonth;
      if (!dataMap.has(key)) {
        dataMap.set(key, { income: '0', expenses: '0' });
      }
      const entry = dataMap.get(key)!;
      if (row.type === 'income') {
        entry.income = row.total;
      } else if (row.type === 'expense') {
        entry.expenses = row.total;
      }
    }
    
    // Build results array for each month
    const results = [];
    for (let i = months - 1; i >= 0; i--) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const yearMonth = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`;
      const data = dataMap.get(yearMonth) || { income: '0', expenses: '0' };
      const netIncome = (parseFloat(data.income) - parseFloat(data.expenses)).toFixed(2);
      
      results.push({
        month: targetDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        income: data.income,
        expenses: data.expenses,
        netIncome,
      });
    }
    
    return results;
  }

  async getComplianceMetrics(organizationId: number): Promise<{
    totalGrants: number;
    activeGrants: number;
    upcomingDeadlines: number;
    overdueItems: number;
    completedReports: number;
    pendingReports: number;
  }> {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now);
    thirtyDaysFromNow.setDate(now.getDate() + 30);

    // Count total and active grants
    const [grantsCount] = await db
      .select({
        total: sql<number>`COUNT(*)::int`,
        active: sql<number>`COUNT(CASE WHEN ${grants.status} = 'active' THEN 1 END)::int`,
      })
      .from(grants)
      .where(eq(grants.organizationId, organizationId));

    // Count upcoming deadlines (grants ending within 30 days)
    const [deadlinesCount] = await db
      .select({
        count: sql<number>`COUNT(*)::int`,
      })
      .from(grants)
      .where(
        and(
          eq(grants.organizationId, organizationId),
          eq(grants.status, 'active'),
          gte(grants.endDate, now),
          lte(grants.endDate, thirtyDaysFromNow)
        )
      );

    // Count overdue federal reports
    const [overdueCount] = await db
      .select({
        count: sql<number>`COUNT(*)::int`,
      })
      .from(federalFinancialReports)
      .innerJoin(grants, eq(federalFinancialReports.grantId, grants.id))
      .where(
        and(
          eq(grants.organizationId, organizationId),
          eq(federalFinancialReports.status, 'draft'),
          lt(federalFinancialReports.reportingPeriodEnd, now)
        )
      );

    // Count completed and pending reports
    const [reportsCount] = await db
      .select({
        completed: sql<number>`COUNT(CASE WHEN ${federalFinancialReports.status} = 'submitted' THEN 1 END)::int`,
        pending: sql<number>`COUNT(CASE WHEN ${federalFinancialReports.status} IN ('draft', 'under_review') THEN 1 END)::int`,
      })
      .from(federalFinancialReports)
      .innerJoin(grants, eq(federalFinancialReports.grantId, grants.id))
      .where(eq(grants.organizationId, organizationId));

    return {
      totalGrants: grantsCount?.total || 0,
      activeGrants: grantsCount?.active || 0,
      upcomingDeadlines: deadlinesCount?.count || 0,
      overdueItems: overdueCount?.count || 0,
      completedReports: reportsCount?.completed || 0,
      pendingReports: reportsCount?.pending || 0,
    };
  }

  async getGrantCompliance(organizationId: number): Promise<Array<{
    grant: Grant;
    timeEffortReports: { total: number; pending: number; certified: number };
    costAllowabilityChecks: { total: number; pending: number; approved: number };
    federalReports: { total: number; pending: number; submitted: number };
    auditPrepItems: { total: number; pending: number; completed: number };
    nextDeadline: Date | null;
    complianceScore: number;
  }>> {
    const activeGrants = await db
      .select()
      .from(grants)
      .where(
        and(
          eq(grants.organizationId, organizationId),
          eq(grants.status, 'active')
        )
      );

    const results = [];
    
    for (const grant of activeGrants) {
      // Time/Effort Reports - uses certificationDate (null = pending, not null = certified)
      const [timeEffortStats] = await db
        .select({
          total: sql<number>`COUNT(*)::int`,
          pending: sql<number>`COUNT(CASE WHEN certification_date IS NULL THEN 1 END)::int`,
          certified: sql<number>`COUNT(CASE WHEN certification_date IS NOT NULL THEN 1 END)::int`,
        })
        .from(timeEffortReports)
        .where(eq(timeEffortReports.grantId, grant.id));

      // Cost Allowability Checks
      const [costStats] = await db
        .select({
          total: sql<number>`COUNT(*)::int`,
          pending: sql<number>`COUNT(CASE WHEN allowability_status = 'pending' THEN 1 END)::int`,
          approved: sql<number>`COUNT(CASE WHEN allowability_status = 'allowable' THEN 1 END)::int`,
        })
        .from(costAllowabilityChecks)
        .where(eq(costAllowabilityChecks.grantId, grant.id));

      // Federal Reports
      const [reportsStats] = await db
        .select({
          total: sql<number>`COUNT(*)::int`,
          pending: sql<number>`COUNT(CASE WHEN status IN ('draft', 'under_review') THEN 1 END)::int`,
          submitted: sql<number>`COUNT(CASE WHEN status = 'submitted' THEN 1 END)::int`,
        })
        .from(federalFinancialReports)
        .where(eq(federalFinancialReports.grantId, grant.id));

      // Audit Prep Items - uses completion_status field
      const [auditStats] = await db
        .select({
          total: sql<number>`COUNT(*)::int`,
          pending: sql<number>`COUNT(CASE WHEN completion_status IN ('not_started', 'in_progress') THEN 1 END)::int`,
          completed: sql<number>`COUNT(CASE WHEN completion_status = 'completed' THEN 1 END)::int`,
        })
        .from(auditPrepItems)
        .where(eq(auditPrepItems.grantId, grant.id));

      // Calculate compliance score
      const totalItems = 
        (timeEffortStats?.total || 0) +
        (costStats?.total || 0) +
        (reportsStats?.total || 0) +
        (auditStats?.total || 0);

      const completedItems = 
        (timeEffortStats?.certified || 0) +
        (costStats?.approved || 0) +
        (reportsStats?.submitted || 0) +
        (auditStats?.completed || 0);

      const complianceScore = totalItems > 0 
        ? Math.round((completedItems / totalItems) * 100)
        : 100;

      results.push({
        grant,
        timeEffortReports: {
          total: timeEffortStats?.total || 0,
          pending: timeEffortStats?.pending || 0,
          certified: timeEffortStats?.certified || 0,
        },
        costAllowabilityChecks: {
          total: costStats?.total || 0,
          pending: costStats?.pending || 0,
          approved: costStats?.approved || 0,
        },
        federalReports: {
          total: reportsStats?.total || 0,
          pending: reportsStats?.pending || 0,
          submitted: reportsStats?.submitted || 0,
        },
        auditPrepItems: {
          total: auditStats?.total || 0,
          pending: auditStats?.pending || 0,
          completed: auditStats?.completed || 0,
        },
        nextDeadline: grant.endDate,
        complianceScore,
      });
    }

    return results;
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

  // Enhanced Analytics operations
  async getYearOverYearAnalytics(organizationId: number): Promise<{
    currentYear: { income: string; expenses: string; netIncome: string };
    previousYear: { income: string; expenses: string; netIncome: string };
    change: { income: string; expenses: string; netIncome: string; incomePercent: number; expensesPercent: number; netIncomePercent: number };
    monthlyComparison: Array<{
      month: string;
      currentYearIncome: string;
      previousYearIncome: string;
      currentYearExpenses: string;
      previousYearExpenses: string;
    }>;
  }> {
    const now = new Date();
    const currentYearStart = new Date(now.getFullYear(), 0, 1);
    const currentYearEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
    const previousYearStart = new Date(now.getFullYear() - 1, 0, 1);
    const previousYearEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59);

    // Get current year totals
    const [currentYearIncome] = await db
      .select({ total: sql<string>`COALESCE(SUM(${transactions.amount}), 0)` })
      .from(transactions)
      .where(and(
        eq(transactions.organizationId, organizationId),
        eq(transactions.type, 'income'),
        gte(transactions.date, currentYearStart),
        lte(transactions.date, currentYearEnd)
      ));

    const [currentYearExpenses] = await db
      .select({ total: sql<string>`COALESCE(SUM(${transactions.amount}), 0)` })
      .from(transactions)
      .where(and(
        eq(transactions.organizationId, organizationId),
        eq(transactions.type, 'expense'),
        gte(transactions.date, currentYearStart),
        lte(transactions.date, currentYearEnd)
      ));

    // Get previous year totals
    const [previousYearIncome] = await db
      .select({ total: sql<string>`COALESCE(SUM(${transactions.amount}), 0)` })
      .from(transactions)
      .where(and(
        eq(transactions.organizationId, organizationId),
        eq(transactions.type, 'income'),
        gte(transactions.date, previousYearStart),
        lte(transactions.date, previousYearEnd)
      ));

    const [previousYearExpenses] = await db
      .select({ total: sql<string>`COALESCE(SUM(${transactions.amount}), 0)` })
      .from(transactions)
      .where(and(
        eq(transactions.organizationId, organizationId),
        eq(transactions.type, 'expense'),
        gte(transactions.date, previousYearStart),
        lte(transactions.date, previousYearEnd)
      ));

    const currentIncome = parseFloat(currentYearIncome?.total || '0');
    const currentExpenses = parseFloat(currentYearExpenses?.total || '0');
    const previousIncome = parseFloat(previousYearIncome?.total || '0');
    const previousExpenses = parseFloat(previousYearExpenses?.total || '0');

    const currentNet = currentIncome - currentExpenses;
    const previousNet = previousIncome - previousExpenses;

    const changeIncome = currentIncome - previousIncome;
    const changeExpenses = currentExpenses - previousExpenses;
    const changeNet = currentNet - previousNet;

    const incomePercent = previousIncome > 0 ? (changeIncome / previousIncome) * 100 : 0;
    const expensesPercent = previousExpenses > 0 ? (changeExpenses / previousExpenses) * 100 : 0;
    const netIncomePercent = previousNet !== 0 ? (changeNet / Math.abs(previousNet)) * 100 : 0;

    // Get monthly comparison for last 12 months
    const monthlyComparison: Array<{
      month: string;
      currentYearIncome: string;
      previousYearIncome: string;
      currentYearExpenses: string;
      previousYearExpenses: string;
    }> = [];

    for (let i = 0; i < 12; i++) {
      const currentMonthStart = new Date(now.getFullYear(), i, 1);
      const currentMonthEnd = new Date(now.getFullYear(), i + 1, 0, 23, 59, 59);
      const previousMonthStart = new Date(now.getFullYear() - 1, i, 1);
      const previousMonthEnd = new Date(now.getFullYear() - 1, i + 1, 0, 23, 59, 59);

      const [currentMonthIncome] = await db
        .select({ total: sql<string>`COALESCE(SUM(${transactions.amount}), 0)` })
        .from(transactions)
        .where(and(
          eq(transactions.organizationId, organizationId),
          eq(transactions.type, 'income'),
          gte(transactions.date, currentMonthStart),
          lte(transactions.date, currentMonthEnd)
        ));

      const [previousMonthIncome] = await db
        .select({ total: sql<string>`COALESCE(SUM(${transactions.amount}), 0)` })
        .from(transactions)
        .where(and(
          eq(transactions.organizationId, organizationId),
          eq(transactions.type, 'income'),
          gte(transactions.date, previousMonthStart),
          lte(transactions.date, previousMonthEnd)
        ));

      const [currentMonthExpenses] = await db
        .select({ total: sql<string>`COALESCE(SUM(${transactions.amount}), 0)` })
        .from(transactions)
        .where(and(
          eq(transactions.organizationId, organizationId),
          eq(transactions.type, 'expense'),
          gte(transactions.date, currentMonthStart),
          lte(transactions.date, currentMonthEnd)
        ));

      const [previousMonthExpenses] = await db
        .select({ total: sql<string>`COALESCE(SUM(${transactions.amount}), 0)` })
        .from(transactions)
        .where(and(
          eq(transactions.organizationId, organizationId),
          eq(transactions.type, 'expense'),
          gte(transactions.date, previousMonthStart),
          lte(transactions.date, previousMonthEnd)
        ));

      monthlyComparison.push({
        month: currentMonthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        currentYearIncome: currentMonthIncome?.total || '0',
        previousYearIncome: previousMonthIncome?.total || '0',
        currentYearExpenses: currentMonthExpenses?.total || '0',
        previousYearExpenses: previousMonthExpenses?.total || '0',
      });
    }

    return {
      currentYear: {
        income: currentIncome.toFixed(2),
        expenses: currentExpenses.toFixed(2),
        netIncome: currentNet.toFixed(2),
      },
      previousYear: {
        income: previousIncome.toFixed(2),
        expenses: previousExpenses.toFixed(2),
        netIncome: previousNet.toFixed(2),
      },
      change: {
        income: changeIncome.toFixed(2),
        expenses: changeExpenses.toFixed(2),
        netIncome: changeNet.toFixed(2),
        incomePercent: Number(incomePercent.toFixed(2)),
        expensesPercent: Number(expensesPercent.toFixed(2)),
        netIncomePercent: Number(netIncomePercent.toFixed(2)),
      },
      monthlyComparison,
    };
  }

  async getForecastAnalytics(organizationId: number, months: number): Promise<{
    forecast: Array<{
      month: string;
      projectedIncome: string;
      projectedExpenses: string;
      projectedNetIncome: string;
      confidence: 'high' | 'medium' | 'low';
    }>;
    trendAnalysis: {
      incomeGrowthRate: number;
      expenseGrowthRate: number;
      averageMonthlyIncome: string;
      averageMonthlyExpenses: string;
    };
  }> {
    // Get last 12 months of data for trend analysis
    const trends = await this.getMonthlyTrends(organizationId, 12);

    if (trends.length < 3) {
      // Not enough data for forecasting
      return {
        forecast: [],
        trendAnalysis: {
          incomeGrowthRate: 0,
          expenseGrowthRate: 0,
          averageMonthlyIncome: '0',
          averageMonthlyExpenses: '0',
        },
      };
    }

    // Calculate trend analysis
    const avgIncome = trends.reduce((sum, t) => sum + parseFloat(t.income), 0) / trends.length;
    const avgExpenses = trends.reduce((sum, t) => sum + parseFloat(t.expenses), 0) / trends.length;

    // Calculate growth rates using linear regression
    const incomeGrowthRate = this.calculateGrowthRate(trends.map(t => parseFloat(t.income)));
    const expenseGrowthRate = this.calculateGrowthRate(trends.map(t => parseFloat(t.expenses)));

    // Generate forecast
    const forecast: Array<{
      month: string;
      projectedIncome: string;
      projectedExpenses: string;
      projectedNetIncome: string;
      confidence: 'high' | 'medium' | 'low';
    }> = [];

    const now = new Date();
    const lastIncome = parseFloat(trends[trends.length - 1].income);
    const lastExpenses = parseFloat(trends[trends.length - 1].expenses);

    for (let i = 1; i <= months; i++) {
      const futureDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const projectedIncome = lastIncome * Math.pow(1 + incomeGrowthRate, i);
      const projectedExpenses = lastExpenses * Math.pow(1 + expenseGrowthRate, i);

      // Determine confidence based on data consistency
      const confidence = trends.length >= 12 ? 'high' : trends.length >= 6 ? 'medium' : 'low';

      forecast.push({
        month: futureDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        projectedIncome: projectedIncome.toFixed(2),
        projectedExpenses: projectedExpenses.toFixed(2),
        projectedNetIncome: (projectedIncome - projectedExpenses).toFixed(2),
        confidence,
      });
    }

    return {
      forecast,
      trendAnalysis: {
        incomeGrowthRate: Number((incomeGrowthRate * 100).toFixed(2)),
        expenseGrowthRate: Number((expenseGrowthRate * 100).toFixed(2)),
        averageMonthlyIncome: avgIncome.toFixed(2),
        averageMonthlyExpenses: avgExpenses.toFixed(2),
      },
    };
  }

  private calculateGrowthRate(values: number[]): number {
    if (values.length < 2) return 0;

    // Simple linear regression
    const n = values.length;
    const xSum = (n * (n + 1)) / 2; // Sum of 1,2,3,...,n
    const ySum = values.reduce((a, b) => a + b, 0);
    const xySum = values.reduce((sum, y, i) => sum + (i + 1) * y, 0);
    const xxSum = (n * (n + 1) * (2 * n + 1)) / 6; // Sum of 1²,2²,3²,...,n²

    const slope = (n * xySum - xSum * ySum) / (n * xxSum - xSum * xSum);
    const avgValue = ySum / n;

    return avgValue > 0 ? slope / avgValue : 0;
  }

  async getFinancialHealthMetrics(organizationId: number): Promise<{
    burnRate: string;
    runway: number | null;
    cashReserves: string;
    quickRatio: number | null;
    profitMargin: number;
    monthlyAvgIncome: string;
    monthlyAvgExpenses: string;
    healthScore: number;
    healthStatus: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  }> {
    // Get last 6 months trends
    const trends = await this.getMonthlyTrends(organizationId, 6);

    const monthlyAvgIncome = trends.length > 0 
      ? (trends.reduce((sum, t) => sum + parseFloat(t.income), 0) / trends.length).toFixed(2)
      : '0';

    const monthlyAvgExpenses = trends.length > 0
      ? (trends.reduce((sum, t) => sum + parseFloat(t.expenses), 0) / trends.length).toFixed(2)
      : '0';

    const avgIncome = parseFloat(monthlyAvgIncome);
    const avgExpenses = parseFloat(monthlyAvgExpenses);

    // Calculate burn rate (monthly net loss)
    const burnRate = avgExpenses > avgIncome ? (avgExpenses - avgIncome).toFixed(2) : '0';

    // Get current cash reserves (sum of all income - expenses)
    const [totalIncome] = await db
      .select({ total: sql<string>`COALESCE(SUM(${transactions.amount}), 0)` })
      .from(transactions)
      .where(and(
        eq(transactions.organizationId, organizationId),
        eq(transactions.type, 'income')
      ));

    const [totalExpenses] = await db
      .select({ total: sql<string>`COALESCE(SUM(${transactions.amount}), 0)` })
      .from(transactions)
      .where(and(
        eq(transactions.organizationId, organizationId),
        eq(transactions.type, 'expense')
      ));

    const cashReserves = (parseFloat(totalIncome?.total || '0') - parseFloat(totalExpenses?.total || '0')).toFixed(2);
    const cashReservesNum = parseFloat(cashReserves);

    // Calculate runway (months until cash runs out)
    const burnRateNum = parseFloat(burnRate);
    const runway = burnRateNum > 0 && cashReservesNum > 0
      ? Math.floor(cashReservesNum / burnRateNum)
      : null;

    // Calculate profit margin
    const profitMargin = avgIncome > 0 ? ((avgIncome - avgExpenses) / avgIncome) * 100 : 0;

    // Quick ratio (simplified: cash / monthly expenses)
    const quickRatio = avgExpenses > 0 ? cashReservesNum / avgExpenses : null;

    // Calculate health score (0-100)
    let healthScore = 50; // Base score

    // Positive factors
    if (profitMargin > 0) healthScore += 20;
    if (profitMargin > 20) healthScore += 10;
    if (cashReservesNum > avgExpenses * 3) healthScore += 10;
    if (quickRatio && quickRatio > 6) healthScore += 10;

    // Negative factors
    if (profitMargin < 0) healthScore -= 20;
    if (cashReservesNum < avgExpenses * 2) healthScore -= 10;
    if (runway !== null && runway < 3) healthScore -= 20;

    healthScore = Math.max(0, Math.min(100, healthScore));

    // Determine health status
    let healthStatus: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
    if (healthScore >= 80) healthStatus = 'excellent';
    else if (healthScore >= 60) healthStatus = 'good';
    else if (healthScore >= 40) healthStatus = 'fair';
    else if (healthScore >= 20) healthStatus = 'poor';
    else healthStatus = 'critical';

    return {
      burnRate,
      runway,
      cashReserves,
      quickRatio: quickRatio !== null ? Number(quickRatio.toFixed(2)) : null,
      profitMargin: Number(profitMargin.toFixed(2)),
      monthlyAvgIncome,
      monthlyAvgExpenses,
      healthScore,
      healthStatus,
    };
  }

  async getSpendingInsights(organizationId: number): Promise<{
    topExpenseCategories: Array<{ categoryName: string; amount: string; percentage: number; trend: 'up' | 'down' | 'stable' }>;
    unusualSpending: Array<{ categoryName: string; currentAmount: string; averageAmount: string; percentDiff: number }>;
    recurringExpenses: Array<{ description: string; amount: string; frequency: string; nextDate: string }>;
    savingsOpportunities: Array<{ category: string; potentialSavings: string; recommendation: string }>;
  }> {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    // Get current month expenses by category
    const currentMonthExpenses = await db
      .select({
        categoryName: categories.name,
        categoryId: categories.id,
        amount: sql<string>`SUM(${transactions.amount})`,
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(and(
        eq(transactions.organizationId, organizationId),
        eq(transactions.type, 'expense'),
        gte(transactions.date, currentMonthStart),
        lte(transactions.date, currentMonthEnd)
      ))
      .groupBy(categories.name, categories.id)
      .orderBy(sql`SUM(${transactions.amount}) DESC`);

    // Get previous month expenses for trend comparison
    const previousMonthExpenses = await db
      .select({
        categoryName: categories.name,
        categoryId: categories.id,
        amount: sql<string>`SUM(${transactions.amount})`,
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(and(
        eq(transactions.organizationId, organizationId),
        eq(transactions.type, 'expense'),
        gte(transactions.date, previousMonthStart),
        lte(transactions.date, previousMonthEnd)
      ))
      .groupBy(categories.name, categories.id);

    // Calculate total expenses for percentage
    const totalExpenses = currentMonthExpenses.reduce((sum, cat) => sum + parseFloat(cat.amount), 0);

    // Build top expense categories with trends
    const topExpenseCategories = currentMonthExpenses.slice(0, 10).map(cat => {
      const percentage = totalExpenses > 0 ? (parseFloat(cat.amount) / totalExpenses) * 100 : 0;
      const previousAmount = previousMonthExpenses.find(p => p.categoryId === cat.categoryId);
      const currentAmount = parseFloat(cat.amount);
      const prevAmount = previousAmount ? parseFloat(previousAmount.amount) : 0;

      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (prevAmount > 0) {
        const change = ((currentAmount - prevAmount) / prevAmount) * 100;
        if (change > 10) trend = 'up';
        else if (change < -10) trend = 'down';
      }

      return {
        categoryName: cat.categoryName || 'Uncategorized',
        amount: cat.amount,
        percentage: Number(percentage.toFixed(2)),
        trend,
      };
    });

    // Detect unusual spending (>50% above average for last 6 months)
    const unusualSpending: Array<{ categoryName: string; currentAmount: string; averageAmount: string; percentDiff: number }> = [];

    for (const cat of currentMonthExpenses) {
      if (!cat.categoryId) continue;

      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
      const [avgResult] = await db
        .select({
          avg: sql<string>`AVG(monthly_sum)`,
        })
        .from(sql`(
          SELECT SUM(${transactions.amount}) as monthly_sum
          FROM ${transactions}
          WHERE ${transactions.organizationId} = ${organizationId}
            AND ${transactions.categoryId} = ${cat.categoryId}
            AND ${transactions.type} = 'expense'
            AND ${transactions.date} >= ${sixMonthsAgo}
          GROUP BY DATE_TRUNC('month', ${transactions.date})
        ) as monthly_totals`);

      const avgAmount = parseFloat(avgResult?.avg || '0');
      const currentAmount = parseFloat(cat.amount);

      if (avgAmount > 0 && currentAmount > avgAmount * 1.5) {
        unusualSpending.push({
          categoryName: cat.categoryName || 'Uncategorized',
          currentAmount: currentAmount.toFixed(2),
          averageAmount: avgAmount.toFixed(2),
          percentDiff: Number((((currentAmount - avgAmount) / avgAmount) * 100).toFixed(2)),
        });
      }
    }

    // Get recurring expenses
    const activeRecurringTransactions = await db
      .select()
      .from(recurringTransactions)
      .where(and(
        eq(recurringTransactions.organizationId, organizationId),
        eq(recurringTransactions.type, 'expense'),
        eq(recurringTransactions.isActive, 1)
      ))
      .orderBy(desc(recurringTransactions.amount))
      .limit(10);

    const recurringExpenses = activeRecurringTransactions.map(rt => ({
      description: rt.description,
      amount: rt.amount,
      frequency: rt.frequency,
      nextDate: rt.nextDate.toISOString().split('T')[0],
    }));

    // Identify savings opportunities (high-spending categories with increasing trends)
    const savingsOpportunities: Array<{ category: string; potentialSavings: string; recommendation: string }> = [];

    for (const cat of topExpenseCategories.slice(0, 5)) {
      if (cat.trend === 'up' && cat.percentage > 15) {
        const potentialSavings = (parseFloat(cat.amount) * 0.1).toFixed(2); // Assume 10% savings potential
        savingsOpportunities.push({
          category: cat.categoryName,
          potentialSavings,
          recommendation: `Consider reviewing ${cat.categoryName} expenses. This category has increased and represents ${cat.percentage.toFixed(1)}% of total spending. Potential 10% reduction could save $${potentialSavings}/month.`,
        });
      }
    }

    return {
      topExpenseCategories,
      unusualSpending,
      recurringExpenses,
      savingsOpportunities,
    };
  }

  // Plaid operations
  async getPlaidItems(organizationId: number): Promise<PlaidItem[]> {
    const { decryptAccessToken } = await import('./encryption');
    const items = await db
      .select()
      .from(plaidItems)
      .where(eq(plaidItems.organizationId, organizationId))
      .orderBy(desc(plaidItems.createdAt));
    return items.map(item => ({
      ...item,
      accessToken: decryptAccessToken(item.accessToken),
    }));
  }

  async getPlaidItem(itemId: string): Promise<PlaidItem | undefined> {
    const { decryptAccessToken } = await import('./encryption');
    const [item] = await db
      .select()
      .from(plaidItems)
      .where(eq(plaidItems.itemId, itemId));
    if (!item) return undefined;
    return { ...item, accessToken: decryptAccessToken(item.accessToken) };
  }

  async getPlaidItemByPlaidId(plaidItemId: string): Promise<PlaidItem | undefined> {
    const { decryptAccessToken } = await import('./encryption');
    const [item] = await db
      .select()
      .from(plaidItems)
      .where(eq(plaidItems.itemId, plaidItemId));
    if (!item) return undefined;
    return { ...item, accessToken: decryptAccessToken(item.accessToken) };
  }

  async updatePlaidItemStatus(id: number, updates: { status?: 'active' | 'login_required' | 'error' | 'pending'; errorCode?: string | null; errorMessage?: string | null; lastSyncedAt?: Date }): Promise<void> {
    await db
      .update(plaidItems)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(plaidItems.id, id));
  }

  async updatePlaidItemCursor(id: number, cursor: string): Promise<void> {
    await db
      .update(plaidItems)
      .set({
        cursor,
        lastSyncedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(plaidItems.id, id));
  }

  async createPlaidItem(item: InsertPlaidItem): Promise<PlaidItem> {
    const { encryptAccessToken, decryptAccessToken } = await import('./encryption');
    const [plaidItem] = await db
      .insert(plaidItems)
      .values({ ...item, accessToken: encryptAccessToken(item.accessToken) })
      .returning();
    return { ...plaidItem, accessToken: decryptAccessToken(plaidItem.accessToken) };
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

  async updatePlaidAccountAuth(accountId: string, data: { accountNumber: string | null; routingNumber: string | null; wireRoutingNumber: string | null }): Promise<void> {
    const { encryptField } = await import('./encryption');
    await db
      .update(plaidAccounts)
      .set({
        accountNumberEncrypted: encryptField(data.accountNumber),
        routingNumberEncrypted: encryptField(data.routingNumber),
        wireRoutingNumberEncrypted: encryptField(data.wireRoutingNumber),
        authFetchedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(plaidAccounts.accountId, accountId));
  }

  async updatePlaidAccountIdentity(accountId: string, data: { ownerNames: string[]; ownerEmails: string[]; ownerPhoneNumbers: string[]; ownerAddresses: any[] }): Promise<void> {
    await db
      .update(plaidAccounts)
      .set({
        ownerNames: data.ownerNames,
        ownerEmails: data.ownerEmails,
        ownerPhoneNumbers: data.ownerPhoneNumbers,
        ownerAddresses: data.ownerAddresses,
        identityFetchedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(plaidAccounts.accountId, accountId));
  }

  async getPlaidAccountByAccountId(accountId: string): Promise<PlaidAccount | undefined> {
    const [account] = await db
      .select()
      .from(plaidAccounts)
      .where(eq(plaidAccounts.accountId, accountId));
    return account;
  }

  async updatePlaidAccountInitialBalance(accountId: string, initialBalance: string, initialBalanceDate: string): Promise<void> {
    await db
      .update(plaidAccounts)
      .set({
        initialBalance,
        initialBalanceDate,
        updatedAt: new Date(),
      })
      .where(eq(plaidAccounts.accountId, accountId));
  }

  async clearPlaidAccountSensitiveData(plaidItemId: number): Promise<void> {
    await db
      .update(plaidAccounts)
      .set({
        accountNumberEncrypted: null,
        routingNumberEncrypted: null,
        wireRoutingNumberEncrypted: null,
        ownerNames: null,
        ownerEmails: null,
        ownerPhoneNumbers: null,
        ownerAddresses: null,
        authFetchedAt: null,
        identityFetchedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(plaidAccounts.plaidItemId, plaidItemId));
  }

  async deletePlaidAccountByAccountId(accountId: string): Promise<void> {
    await db
      .delete(plaidAccounts)
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

  async updateUserRole(userId: string, organizationId: number, role: string): Promise<void> {
    await db
      .update(userOrganizationRoles)
      .set({ role: role as any })
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

  async getTransactionIdsLinkedToBills(organizationId: number): Promise<number[]> {
    const results = await db
      .select({ transactionId: bills.transactionId })
      .from(bills)
      .where(and(
        eq(bills.organizationId, organizationId),
        isNotNull(bills.transactionId)
      ));
    return results.map(r => r.transactionId!).filter(id => id !== null);
  }

  // ============================================
  // DISMISSED PATTERN OPERATIONS
  // ============================================

  async getDismissedPatterns(organizationId: number): Promise<DismissedPattern[]> {
    return await db
      .select()
      .from(dismissedPatterns)
      .where(eq(dismissedPatterns.organizationId, organizationId))
      .orderBy(desc(dismissedPatterns.dismissedAt));
  }

  async createDismissedPattern(pattern: InsertDismissedPattern & { dismissedBy: string }): Promise<DismissedPattern> {
    const [newPattern] = await db.insert(dismissedPatterns).values(pattern).returning();
    return newPattern;
  }

  async deleteDismissedPattern(id: number): Promise<void> {
    await db.delete(dismissedPatterns).where(eq(dismissedPatterns.id, id));
  }

  async isPatternDismissed(organizationId: number, vendorName: string, patternType: 'income' | 'expense'): Promise<boolean> {
    const [dismissed] = await db
      .select()
      .from(dismissedPatterns)
      .where(
        and(
          eq(dismissedPatterns.organizationId, organizationId),
          eq(dismissedPatterns.vendorName, vendorName),
          eq(dismissedPatterns.patternType, patternType)
        )
      )
      .limit(1);
    return !!dismissed;
  }

  // ============================================
  // AUTO-PAY RULE OPERATIONS
  // ============================================

  async getAutoPayRules(organizationId: number): Promise<Array<AutoPayRule & { vendorName: string | null }>> {
    const results = await db
      .select({
        id: autoPayRules.id,
        organizationId: autoPayRules.organizationId,
        name: autoPayRules.name,
        ruleType: autoPayRules.ruleType,
        status: autoPayRules.status,
        vendorId: autoPayRules.vendorId,
        minAmount: autoPayRules.minAmount,
        maxAmount: autoPayRules.maxAmount,
        daysBeforeDue: autoPayRules.daysBeforeDue,
        paymentMethod: autoPayRules.paymentMethod,
        requiresApproval: autoPayRules.requiresApproval,
        notifyOnPayment: autoPayRules.notifyOnPayment,
        notifyDaysBeforePayment: autoPayRules.notifyDaysBeforePayment,
        createdBy: autoPayRules.createdBy,
        createdAt: autoPayRules.createdAt,
        updatedAt: autoPayRules.updatedAt,
        vendorName: vendors.name,
      })
      .from(autoPayRules)
      .leftJoin(vendors, eq(autoPayRules.vendorId, vendors.id))
      .where(eq(autoPayRules.organizationId, organizationId))
      .orderBy(desc(autoPayRules.createdAt));
    return results;
  }

  async getAutoPayRule(id: number): Promise<AutoPayRule | undefined> {
    const [rule] = await db.select().from(autoPayRules).where(eq(autoPayRules.id, id));
    return rule;
  }

  async createAutoPayRule(rule: InsertAutoPayRule): Promise<AutoPayRule> {
    const [newRule] = await db.insert(autoPayRules).values(rule).returning();
    return newRule;
  }

  async updateAutoPayRule(id: number, updates: Partial<InsertAutoPayRule>): Promise<AutoPayRule> {
    const [updatedRule] = await db
      .update(autoPayRules)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(autoPayRules.id, id))
      .returning();
    return updatedRule;
  }

  async deleteAutoPayRule(id: number): Promise<void> {
    await db.delete(autoPayRules).where(eq(autoPayRules.id, id));
  }

  async getActiveAutoPayRules(organizationId: number): Promise<Array<AutoPayRule & { vendorName: string | null }>> {
    const results = await db
      .select({
        id: autoPayRules.id,
        organizationId: autoPayRules.organizationId,
        name: autoPayRules.name,
        ruleType: autoPayRules.ruleType,
        status: autoPayRules.status,
        vendorId: autoPayRules.vendorId,
        minAmount: autoPayRules.minAmount,
        maxAmount: autoPayRules.maxAmount,
        daysBeforeDue: autoPayRules.daysBeforeDue,
        paymentMethod: autoPayRules.paymentMethod,
        requiresApproval: autoPayRules.requiresApproval,
        notifyOnPayment: autoPayRules.notifyOnPayment,
        notifyDaysBeforePayment: autoPayRules.notifyDaysBeforePayment,
        createdBy: autoPayRules.createdBy,
        createdAt: autoPayRules.createdAt,
        updatedAt: autoPayRules.updatedAt,
        vendorName: vendors.name,
      })
      .from(autoPayRules)
      .leftJoin(vendors, eq(autoPayRules.vendorId, vendors.id))
      .where(and(
        eq(autoPayRules.organizationId, organizationId),
        eq(autoPayRules.status, 'active')
      ))
      .orderBy(desc(autoPayRules.createdAt));
    return results;
  }

  async getMatchingAutoPayRules(bill: Bill): Promise<Array<AutoPayRule & { vendorName: string | null }>> {
    const activeRules = await this.getActiveAutoPayRules(bill.organizationId);
    
    return activeRules.filter(rule => {
      const billAmount = parseFloat(bill.totalAmount);
      
      // Check vendor match
      if (rule.ruleType === 'vendor' || rule.ruleType === 'combined') {
        if (rule.vendorId && rule.vendorId !== bill.vendorId) {
          return false;
        }
      }
      
      // Check amount threshold
      if (rule.ruleType === 'amount_threshold' || rule.ruleType === 'combined') {
        const minAmount = rule.minAmount ? parseFloat(rule.minAmount) : 0;
        const maxAmount = rule.maxAmount ? parseFloat(rule.maxAmount) : Infinity;
        if (billAmount < minAmount || billAmount > maxAmount) {
          return false;
        }
      }
      
      return true;
    });
  }

  // ============================================
  // SCHEDULED PAYMENT OPERATIONS
  // ============================================

  async getScheduledPayments(organizationId: number): Promise<Array<ScheduledPayment & { billNumber: string; vendorName: string | null }>> {
    const results = await db
      .select({
        id: scheduledPayments.id,
        organizationId: scheduledPayments.organizationId,
        billId: scheduledPayments.billId,
        autoPayRuleId: scheduledPayments.autoPayRuleId,
        scheduledDate: scheduledPayments.scheduledDate,
        amount: scheduledPayments.amount,
        paymentMethod: scheduledPayments.paymentMethod,
        status: scheduledPayments.status,
        reminderSent: scheduledPayments.reminderSent,
        reminderSentAt: scheduledPayments.reminderSentAt,
        processedAt: scheduledPayments.processedAt,
        failureReason: scheduledPayments.failureReason,
        stripePaymentIntentId: scheduledPayments.stripePaymentIntentId,
        notes: scheduledPayments.notes,
        createdBy: scheduledPayments.createdBy,
        createdAt: scheduledPayments.createdAt,
        updatedAt: scheduledPayments.updatedAt,
        billNumber: bills.billNumber,
        vendorName: vendors.name,
      })
      .from(scheduledPayments)
      .innerJoin(bills, eq(scheduledPayments.billId, bills.id))
      .leftJoin(vendors, eq(bills.vendorId, vendors.id))
      .where(eq(scheduledPayments.organizationId, organizationId))
      .orderBy(scheduledPayments.scheduledDate);
    return results;
  }

  async getScheduledPayment(id: number): Promise<ScheduledPayment | undefined> {
    const [payment] = await db.select().from(scheduledPayments).where(eq(scheduledPayments.id, id));
    return payment;
  }

  async createScheduledPayment(payment: InsertScheduledPayment): Promise<ScheduledPayment> {
    const [newPayment] = await db.insert(scheduledPayments).values(payment).returning();
    return newPayment;
  }

  async updateScheduledPayment(id: number, updates: Partial<InsertScheduledPayment>): Promise<ScheduledPayment> {
    const [updatedPayment] = await db
      .update(scheduledPayments)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(scheduledPayments.id, id))
      .returning();
    return updatedPayment;
  }

  async deleteScheduledPayment(id: number): Promise<void> {
    await db.delete(scheduledPayments).where(eq(scheduledPayments.id, id));
  }

  async getScheduledPaymentsByBill(billId: number): Promise<ScheduledPayment[]> {
    return db.select().from(scheduledPayments).where(eq(scheduledPayments.billId, billId));
  }

  async getPendingScheduledPayments(organizationId: number, beforeDate?: Date): Promise<Array<ScheduledPayment & { billNumber: string; vendorName: string | null; billTotalAmount: string }>> {
    const now = new Date();
    const targetDate = beforeDate || new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // Default: next 7 days
    
    const results = await db
      .select({
        id: scheduledPayments.id,
        organizationId: scheduledPayments.organizationId,
        billId: scheduledPayments.billId,
        autoPayRuleId: scheduledPayments.autoPayRuleId,
        scheduledDate: scheduledPayments.scheduledDate,
        amount: scheduledPayments.amount,
        paymentMethod: scheduledPayments.paymentMethod,
        status: scheduledPayments.status,
        reminderSent: scheduledPayments.reminderSent,
        reminderSentAt: scheduledPayments.reminderSentAt,
        processedAt: scheduledPayments.processedAt,
        failureReason: scheduledPayments.failureReason,
        stripePaymentIntentId: scheduledPayments.stripePaymentIntentId,
        notes: scheduledPayments.notes,
        createdBy: scheduledPayments.createdBy,
        createdAt: scheduledPayments.createdAt,
        updatedAt: scheduledPayments.updatedAt,
        billNumber: bills.billNumber,
        vendorName: vendors.name,
        billTotalAmount: bills.totalAmount,
      })
      .from(scheduledPayments)
      .innerJoin(bills, eq(scheduledPayments.billId, bills.id))
      .leftJoin(vendors, eq(bills.vendorId, vendors.id))
      .where(and(
        eq(scheduledPayments.organizationId, organizationId),
        eq(scheduledPayments.status, 'pending'),
        lte(scheduledPayments.scheduledDate, targetDate)
      ))
      .orderBy(scheduledPayments.scheduledDate);
    return results;
  }

  async processScheduledPayment(id: number): Promise<ScheduledPayment> {
    const [updatedPayment] = await db
      .update(scheduledPayments)
      .set({
        status: 'processing',
        updatedAt: new Date(),
      })
      .where(eq(scheduledPayments.id, id))
      .returning();
    return updatedPayment;
  }

  // ============================================
  // BILL PAYMENT OPERATIONS
  // ============================================

  async getBillPayments(organizationId: number): Promise<Array<BillPayment & { billNumber: string; vendorName: string | null }>> {
    const results = await db
      .select({
        id: billPayments.id,
        organizationId: billPayments.organizationId,
        billId: billPayments.billId,
        scheduledPaymentId: billPayments.scheduledPaymentId,
        amount: billPayments.amount,
        paymentDate: billPayments.paymentDate,
        paymentMethod: billPayments.paymentMethod,
        stripePaymentIntentId: billPayments.stripePaymentIntentId,
        stripeChargeId: billPayments.stripeChargeId,
        checkNumber: billPayments.checkNumber,
        achTransactionId: billPayments.achTransactionId,
        referenceNumber: billPayments.referenceNumber,
        notes: billPayments.notes,
        transactionId: billPayments.transactionId,
        createdBy: billPayments.createdBy,
        createdAt: billPayments.createdAt,
        billNumber: bills.billNumber,
        vendorName: vendors.name,
      })
      .from(billPayments)
      .innerJoin(bills, eq(billPayments.billId, bills.id))
      .leftJoin(vendors, eq(bills.vendorId, vendors.id))
      .where(eq(billPayments.organizationId, organizationId))
      .orderBy(desc(billPayments.paymentDate));
    return results;
  }

  async getBillPayment(id: number): Promise<BillPayment | undefined> {
    const [payment] = await db.select().from(billPayments).where(eq(billPayments.id, id));
    return payment;
  }

  async createBillPayment(payment: InsertBillPayment): Promise<BillPayment> {
    const [newPayment] = await db.insert(billPayments).values(payment).returning();
    
    // Update bill status based on total paid
    const totalPaid = await this.getTotalPaidForBill(payment.billId);
    const bill = await this.getBill(payment.billId);
    
    if (bill) {
      const totalPaidNum = parseFloat(totalPaid);
      const totalAmountNum = parseFloat(bill.totalAmount);
      
      let newStatus: 'paid' | 'partial' | 'received' = 'received';
      if (totalPaidNum >= totalAmountNum) {
        newStatus = 'paid';
      } else if (totalPaidNum > 0) {
        newStatus = 'partial';
      }
      
      await this.updateBill(bill.id, { status: newStatus });
    }
    
    return newPayment;
  }

  async getBillPaymentsByBill(billId: number): Promise<BillPayment[]> {
    return db.select().from(billPayments).where(eq(billPayments.billId, billId)).orderBy(desc(billPayments.paymentDate));
  }

  async getTotalPaidForBill(billId: number): Promise<string> {
    const result = await db
      .select({ total: sql<string>`COALESCE(SUM(${billPayments.amount}), 0)` })
      .from(billPayments)
      .where(eq(billPayments.billId, billId));
    return result[0]?.total || '0';
  }

  // ============================================
  // VENDOR PAYMENT DETAILS OPERATIONS
  // ============================================

  async getVendorPaymentDetails(vendorId: number, organizationId: number): Promise<VendorPaymentDetails | undefined> {
    const [details] = await db
      .select()
      .from(vendorPaymentDetails)
      .where(and(
        eq(vendorPaymentDetails.vendorId, vendorId),
        eq(vendorPaymentDetails.organizationId, organizationId)
      ));
    return details;
  }

  async createVendorPaymentDetails(details: InsertVendorPaymentDetails): Promise<VendorPaymentDetails> {
    const [newDetails] = await db.insert(vendorPaymentDetails).values(details).returning();
    return newDetails;
  }

  async updateVendorPaymentDetails(id: number, updates: Partial<InsertVendorPaymentDetails>): Promise<VendorPaymentDetails> {
    const [updatedDetails] = await db
      .update(vendorPaymentDetails)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(vendorPaymentDetails.id, id))
      .returning();
    return updatedDetails;
  }

  async deleteVendorPaymentDetails(id: number): Promise<void> {
    await db.delete(vendorPaymentDetails).where(eq(vendorPaymentDetails.id, id));
  }

  // ============================================
  // FINCH CONNECTION OPERATIONS
  // ============================================

  async getFinchConnectionsByOrganization(organizationId: number): Promise<FinchConnection[]> {
    return await db.select().from(finchConnections)
      .where(eq(finchConnections.organizationId, organizationId))
      .orderBy(desc(finchConnections.createdAt));
  }

  async getFinchConnectionByConnectionId(connectionId: string): Promise<FinchConnection | undefined> {
    const result = await db.select().from(finchConnections)
      .where(eq(finchConnections.connectionId, connectionId))
      .limit(1);
    return result[0];
  }

  async getFinchConnectionById(id: number): Promise<FinchConnection | undefined> {
    const result = await db.select().from(finchConnections)
      .where(eq(finchConnections.id, id))
      .limit(1);
    return result[0];
  }

  async createFinchConnection(connection: InsertFinchConnection): Promise<FinchConnection> {
    const result = await db.insert(finchConnections).values(connection).returning();
    return result[0];
  }

  async updateFinchConnection(id: number, updates: Partial<InsertFinchConnection>): Promise<FinchConnection> {
    const result = await db.update(finchConnections)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(finchConnections.id, id))
      .returning();
    return result[0];
  }

  async deleteFinchConnection(id: number): Promise<void> {
    await db.delete(finchConnections).where(eq(finchConnections.id, id));
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

    // Get all categories to check tax deductibility
    const orgCategories = await this.getCategories(organizationId);
    const categoryMap = new Map(orgCategories.map(c => [c.id, c]));

    // Calculate totals
    let totalIncome = 0;
    let totalExpenses = 0;
    let totalDeductions = 0;

    const categoryTotals: Record<string, number> = {};
    const deductibleByCategory: Record<string, number> = {};
    const nonDeductibleByCategory: Record<string, number> = {};

    yearTransactions.forEach(tx => {
      const amount = parseFloat(tx.amount);
      if (tx.type === 'income') {
        totalIncome += amount;
      } else {
        totalExpenses += amount;
        
        // Check if expense is tax deductible based on category
        const category = tx.categoryId ? categoryMap.get(tx.categoryId) : null;
        const isDeductible = category ? category.taxDeductible : true; // Default to deductible if no category
        
        if (isDeductible) {
          totalDeductions += amount;
          if (tx.categoryId) {
            deductibleByCategory[tx.categoryId] = (deductibleByCategory[tx.categoryId] || 0) + amount;
          }
        } else {
          if (tx.categoryId) {
            nonDeductibleByCategory[tx.categoryId] = (nonDeductibleByCategory[tx.categoryId] || 0) + amount;
          }
        }
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
          deductibleByCategory,
          nonDeductibleByCategory,
          totalNonDeductible: totalExpenses - totalDeductions,
          transactionCount: yearTransactions.length,
        },
        generatedBy: 'system',
      })
      .returning();

    return report;
  }

  // Custom report operations
  async getCustomReports(organizationId: number): Promise<CustomReport[]> {
    return await db
      .select()
      .from(customReports)
      .where(eq(customReports.organizationId, organizationId))
      .orderBy(desc(customReports.createdAt));
  }

  async getCustomReport(id: number): Promise<CustomReport | undefined> {
    const [report] = await db
      .select()
      .from(customReports)
      .where(eq(customReports.id, id));
    return report;
  }

  async createCustomReport(report: InsertCustomReport): Promise<CustomReport> {
    const [newReport] = await db
      .insert(customReports)
      .values(report)
      .returning();
    return newReport;
  }

  async updateCustomReport(id: number, updates: Partial<InsertCustomReport>): Promise<CustomReport> {
    const [updated] = await db
      .update(customReports)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(customReports.id, id))
      .returning();
    return updated;
  }

  async deleteCustomReport(id: number): Promise<void> {
    await db.delete(customReports).where(eq(customReports.id, id));
  }

  async executeCustomReport(id: number, dateFrom?: string, dateTo?: string): Promise<any[]> {
    const report = await this.getCustomReport(id);
    if (!report) {
      throw new Error('Report not found');
    }

    let query;
    const selectedFields = report.selectedFields as string[];
    const filters = report.filters as any;

    // Define allowed fields for each data source to prevent SQL injection
    const allowedFields: Record<string, string[]> = {
      transactions: ['id', 'organizationId', 'userId', 'date', 'amount', 'type', 'description', 'categoryId', 'vendorId', 'clientId', 'invoiceId', 'billId', 'isRecurring', 'plaidAccountId', 'plaidTransactionId', 'createdAt', 'updatedAt'],
      invoices: ['id', 'organizationId', 'invoiceNumber', 'clientId', 'issueDate', 'dueDate', 'status', 'subtotal', 'taxAmount', 'total', 'notes', 'createdBy', 'createdAt', 'updatedAt'],
      bills: ['id', 'organizationId', 'billNumber', 'vendorId', 'issueDate', 'dueDate', 'status', 'subtotal', 'taxAmount', 'total', 'notes', 'createdBy', 'createdAt', 'updatedAt'],
      grants: ['id', 'organizationId', 'name', 'grantNumber', 'funder', 'amount', 'startDate', 'endDate', 'status', 'description', 'restrictions', 'createdAt', 'updatedAt'],
    };

    // Validate selectedFields against allowed fields
    const dataSourceFields = allowedFields[report.dataSource] || [];
    const validatedFields = selectedFields.filter(field => dataSourceFields.includes(field));

    // Build query based on data source
    switch (report.dataSource) {
      case 'transactions':
        query = db.select().from(transactions);
        
        // Apply organization filter
        query = query.where(eq(transactions.organizationId, report.organizationId));
        
        // Apply date range if provided
        if (dateFrom) {
          query = query.where(gte(transactions.date, new Date(dateFrom)));
        }
        if (dateTo) {
          query = query.where(lte(transactions.date, new Date(dateTo)));
        }
        
        // Apply additional filters from report definition
        if (filters?.type && filters.type !== 'all') {
          query = query.where(eq(transactions.type, filters.type));
        }
        // Support both legacy single categoryId and new categoryIds array
        if (filters?.categoryIds && Array.isArray(filters.categoryIds) && filters.categoryIds.length > 0) {
          query = query.where(inArray(transactions.categoryId, filters.categoryIds));
        } else if (filters?.categoryId) {
          query = query.where(eq(transactions.categoryId, parseInt(filters.categoryId)));
        }
        if (filters?.minAmount) {
          query = query.where(gte(transactions.amount, filters.minAmount));
        }
        if (filters?.maxAmount) {
          query = query.where(lte(transactions.amount, filters.maxAmount));
        }
        break;

      case 'invoices':
        query = db.select().from(invoices);
        query = query.where(eq(invoices.organizationId, report.organizationId));
        
        if (dateFrom) {
          query = query.where(gte(invoices.issueDate, new Date(dateFrom)));
        }
        if (dateTo) {
          query = query.where(lte(invoices.issueDate, new Date(dateTo)));
        }
        
        if (filters?.status && filters.status !== 'all') {
          query = query.where(eq(invoices.status, filters.status));
        }
        break;

      case 'bills':
        query = db.select().from(bills);
        query = query.where(eq(bills.organizationId, report.organizationId));
        
        if (dateFrom) {
          query = query.where(gte(bills.issueDate, new Date(dateFrom)));
        }
        if (dateTo) {
          query = query.where(lte(bills.issueDate, new Date(dateTo)));
        }
        
        if (filters?.status && filters.status !== 'all') {
          query = query.where(eq(bills.status, filters.status));
        }
        break;

      case 'grants':
        query = db.select().from(grants);
        query = query.where(eq(grants.organizationId, report.organizationId));
        
        if (filters?.status && filters.status !== 'all') {
          query = query.where(eq(grants.status, filters.status));
        }
        break;

      default:
        throw new Error(`Unsupported data source: ${report.dataSource}`);
    }

    // Apply sorting (validate sortBy field is in allowed list)
    if (report.sortBy && report.sortOrder && report.sortBy !== 'none') {
      const dataSourceFields = allowedFields[report.dataSource] || [];
      if (dataSourceFields.includes(report.sortBy)) {
        const table = report.dataSource === 'transactions' ? transactions :
                      report.dataSource === 'invoices' ? invoices :
                      report.dataSource === 'bills' ? bills : grants;
        
        const sortField = (table as any)[report.sortBy];
        if (sortField) {
          query = report.sortOrder === 'asc' 
            ? query.orderBy(sortField)
            : query.orderBy(desc(sortField));
        }
      }
    }

    const results = await query;
    
    // Filter results to only include validated selected fields
    if (validatedFields && validatedFields.length > 0) {
      return results.map(row => {
        const filtered: any = {};
        validatedFields.forEach(field => {
          if (row.hasOwnProperty(field)) {
            filtered[field] = (row as any)[field];
          }
        });
        return filtered;
      });
    }

    return results;
  }

  // Audit log operations
  async getAuditLogs(organizationId: number, filters?: {
    entityType?: string;
    entityId?: string;
    userId?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<Array<AuditLog & { userName: string; userEmail: string }>> {
    let query = db
      .select({
        auditLog: auditLogs,
        userName: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`.as('userName'),
        userEmail: users.email,
      })
      .from(auditLogs)
      .innerJoin(users, eq(auditLogs.userId, users.id))
      .where(eq(auditLogs.organizationId, organizationId))
      .$dynamic();

    // Apply filters
    if (filters?.entityType) {
      query = query.where(eq(auditLogs.entityType, filters.entityType));
    }
    if (filters?.entityId) {
      query = query.where(eq(auditLogs.entityId, filters.entityId));
    }
    if (filters?.userId) {
      query = query.where(eq(auditLogs.userId, filters.userId));
    }
    if (filters?.action) {
      query = query.where(eq(auditLogs.action, filters.action as any));
    }
    if (filters?.startDate) {
      query = query.where(gte(auditLogs.timestamp, filters.startDate));
    }
    if (filters?.endDate) {
      query = query.where(lte(auditLogs.timestamp, filters.endDate));
    }

    // Order by timestamp descending (newest first)
    query = query.orderBy(desc(auditLogs.timestamp));

    // Apply limit
    if (filters?.limit) {
      query = query.limit(filters.limit);
    } else {
      query = query.limit(100); // Default limit
    }

    const results = await query;
    return results.map(r => ({
      ...r.auditLog,
      userName: r.userName || 'Unknown User',
      userEmail: r.userEmail || '',
    }));
  }

  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    return await db.transaction(async (tx) => {
      const [latestLog] = await tx
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.organizationId, log.organizationId))
        .orderBy(desc(auditLogs.id))
        .limit(1)
        .for('update');
      
      const previousHash = latestLog?.chainHash || null;
      
      const [newLog] = await tx
        .insert(auditLogs)
        .values({
          ...log,
          previousHash,
        })
        .returning();
      
      const chainHash = computeAuditLogHash(newLog, newLog.timestamp);
      
      const [updatedLog] = await tx
        .update(auditLogs)
        .set({ chainHash })
        .where(eq(auditLogs.id, newLog.id))
        .returning();
      
      return updatedLog;
    });
  }

  async verifyAuditLogChain(organizationId: number): Promise<{
    isValid: boolean;
    tamperedIndices: number[];
    brokenChainIndices: number[];
    nullHashIndices: number[];
    message: string;
  }> {
    const logs = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.organizationId, organizationId))
      .orderBy(auditLogs.id);
    
    if (logs.length === 0) {
      return {
        isValid: true,
        tamperedIndices: [],
        brokenChainIndices: [],
        nullHashIndices: [],
        message: 'No audit logs found for this organization',
      };
    }
    
    const result = verifyChain(logs);
    
    let message = '';
    if (result.isValid) {
      message = `Audit log chain verified successfully (${logs.length} entries)`;
    } else {
      const issues = [];
      if (result.tamperedIndices.length > 0) {
        issues.push(`${result.tamperedIndices.length} tampered entries`);
      }
      if (result.brokenChainIndices.length > 0) {
        issues.push(`${result.brokenChainIndices.length} broken chain links`);
      }
      if (result.nullHashIndices.length > 0) {
        issues.push(`${result.nullHashIndices.length} entries with null hash (initialization error)`);
      }
      message = `Audit log chain integrity compromised: ${issues.join(', ')}`;
    }
    
    return {
      ...result,
      message,
    };
  }

  async repairAuditLogChain(organizationId: number): Promise<{
    repaired: number;
    nullHashesFixed: number;
    brokenLinksFixed: number;
    message: string;
  }> {
    const logs = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.organizationId, organizationId))
      .orderBy(auditLogs.id);
    
    if (logs.length === 0) {
      return {
        repaired: 0,
        nullHashesFixed: 0,
        brokenLinksFixed: 0,
        message: 'No audit logs found for this organization',
      };
    }
    
    const repairs = repairChain(logs);
    
    if (repairs.length === 0) {
      return {
        repaired: 0,
        nullHashesFixed: 0,
        brokenLinksFixed: 0,
        message: 'Audit log chain is already valid, no repairs needed',
      };
    }
    
    const nullHashesFixed = repairs.filter(r => r.repairType === 'null_hash').length;
    const brokenLinksFixed = repairs.filter(r => r.repairType === 'broken_link').length;
    
    // Batch updates in chunks of 100 for better performance
    const BATCH_SIZE = 100;
    for (let i = 0; i < repairs.length; i += BATCH_SIZE) {
      const batch = repairs.slice(i, i + BATCH_SIZE);
      
      // Run batch in parallel within each chunk
      await Promise.all(
        batch.map(repair =>
          db
            .update(auditLogs)
            .set({
              previousHash: repair.previousHash,
              chainHash: repair.chainHash,
            })
            .where(eq(auditLogs.id, repair.log.id))
        )
      );
    }
    
    return {
      repaired: repairs.length,
      nullHashesFixed,
      brokenLinksFixed,
      message: `Successfully repaired ${repairs.length} audit log entries (${nullHashesFixed} missing hashes, ${brokenLinksFixed} broken links)`,
    };
  }

  async logAuditTrail(params: {
    organizationId: number;
    userId: string;
    entityType: string;
    entityId: string;
    action: 'create' | 'update' | 'delete';
    oldValues?: any;
    newValues?: any;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<void> {
    const { organizationId, userId, entityType, entityId, action, oldValues, newValues, ipAddress, userAgent } = params;
    
    // Extract human-readable identifier (invoice number, bill number, etc.)
    let identifier = `#${entityId}`;
    if (entityType === 'invoice' && newValues?.invoiceNumber) {
      identifier = `${newValues.invoiceNumber} (ID: ${entityId})`;
    } else if (entityType === 'bill' && newValues?.billNumber) {
      identifier = `${newValues.billNumber} (ID: ${entityId})`;
    } else if (entityType === 'invoice' && oldValues?.invoiceNumber) {
      identifier = `${oldValues.invoiceNumber} (ID: ${entityId})`;
    } else if (entityType === 'bill' && oldValues?.billNumber) {
      identifier = `${oldValues.billNumber} (ID: ${entityId})`;
    }
    
    // Generate human-readable changes summary
    let changes = '';
    if (action === 'create') {
      changes = `Created ${entityType} ${identifier}`;
    } else if (action === 'update' && oldValues && newValues) {
      const changedFields = Object.keys(newValues).filter(key => 
        JSON.stringify(oldValues[key]) !== JSON.stringify(newValues[key])
      );
      changes = changedFields.length > 0 
        ? `Updated ${entityType} ${identifier}: ${changedFields.join(', ')}`
        : `Updated ${entityType} ${identifier}`;
    } else if (action === 'delete') {
      changes = `Deleted ${entityType} ${identifier}`;
    }

    await this.createAuditLog({
      organizationId,
      userId,
      action,
      entityType,
      entityId: String(entityId),
      oldValues: oldValues || null,
      newValues: newValues || null,
      changes,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
    });
  }

  async logCreate(organizationId: number, userId: string, entityType: string, entityId: string, newValues: any): Promise<void> {
    await this.createAuditLog({
      organizationId,
      userId,
      action: 'create',
      entityType,
      entityId: String(entityId),
      newValues,
      changes: `Created ${entityType} #${entityId}`,
    });
  }

  async logUpdate(organizationId: number, userId: string, entityType: string, entityId: string, oldValues: any, newValues: any): Promise<void> {
    // Generate human-readable changes summary
    const changedFields = Object.keys(newValues).filter(key => 
      JSON.stringify(oldValues[key]) !== JSON.stringify(newValues[key])
    );
    const changes = changedFields.length > 0 
      ? `Updated ${entityType} #${entityId}: ${changedFields.join(', ')}`
      : `Updated ${entityType} #${entityId}`;

    await this.createAuditLog({
      organizationId,
      userId,
      action: 'update',
      entityType,
      entityId: String(entityId),
      oldValues,
      newValues,
      changes,
    });
  }

  async logDelete(organizationId: number, userId: string, entityType: string, entityId: string, oldValues: any): Promise<void> {
    await this.createAuditLog({
      organizationId,
      userId,
      action: 'delete',
      entityType,
      entityId: String(entityId),
      oldValues,
      changes: `Deleted ${entityType} #${entityId}`,
    });
  }

  // Team operations
  async getTeams(organizationId: number): Promise<Team[]> {
    return db.select().from(teams).where(eq(teams.organizationId, organizationId)).orderBy(teams.name);
  }

  async getTeam(id: number): Promise<Team | undefined> {
    const [team] = await db.select().from(teams).where(eq(teams.id, id));
    return team;
  }

  async createTeam(team: InsertTeam): Promise<Team> {
    const [newTeam] = await db.insert(teams).values(team).returning();
    return newTeam;
  }

  async updateTeam(id: number, updates: Partial<InsertTeam>): Promise<Team> {
    const [updatedTeam] = await db.update(teams)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(teams.id, id))
      .returning();
    return updatedTeam;
  }

  async deleteTeam(id: number): Promise<void> {
    await db.delete(teams).where(eq(teams.id, id));
  }

  // Employee operations
  async getEmployees(organizationId: number): Promise<Employee[]> {
    const employeeList = await db.select().from(employees).where(eq(employees.organizationId, organizationId)).orderBy(desc(employees.createdAt));
    
    // Decrypt sensitive fields
    return employeeList.map(e => ({
      ...e,
      bankAccountNumber: e.bankAccountNumber ? decryptField(e.bankAccountNumber) : null,
      bankRoutingNumber: e.bankRoutingNumber ? decryptField(e.bankRoutingNumber) : null,
    }));
  }

  async getEmployee(id: number): Promise<Employee | undefined> {
    const [employee] = await db.select().from(employees).where(eq(employees.id, id));
    if (!employee) return undefined;
    
    // Decrypt sensitive fields
    return {
      ...employee,
      bankAccountNumber: employee.bankAccountNumber ? decryptField(employee.bankAccountNumber) : null,
      bankRoutingNumber: employee.bankRoutingNumber ? decryptField(employee.bankRoutingNumber) : null,
    };
  }

  async getActiveEmployees(organizationId: number): Promise<Employee[]> {
    const employeeList = await db.select().from(employees).where(
      and(eq(employees.organizationId, organizationId), eq(employees.isActive, 1))
    ).orderBy(employees.lastName, employees.firstName);
    
    // Decrypt sensitive fields
    return employeeList.map(e => ({
      ...e,
      bankAccountNumber: e.bankAccountNumber ? decryptField(e.bankAccountNumber) : null,
      bankRoutingNumber: e.bankRoutingNumber ? decryptField(e.bankRoutingNumber) : null,
    }));
  }

  async createEmployee(employee: InsertEmployee): Promise<Employee> {
    const encryptedData = {
      ...employee,
      bankAccountNumber: employee.bankAccountNumber ? encryptField(employee.bankAccountNumber) : null,
      bankRoutingNumber: employee.bankRoutingNumber ? encryptField(employee.bankRoutingNumber) : null,
    };
    
    const [newEmployee] = await db.insert(employees).values(encryptedData).returning();
    
    // Decrypt before returning
    return {
      ...newEmployee,
      bankAccountNumber: newEmployee.bankAccountNumber ? decryptField(newEmployee.bankAccountNumber) : null,
      bankRoutingNumber: newEmployee.bankRoutingNumber ? decryptField(newEmployee.bankRoutingNumber) : null,
    };
  }

  async updateEmployee(id: number, updates: Partial<InsertEmployee>): Promise<Employee> {
    const encryptedUpdates = {
      ...updates,
      bankAccountNumber: updates.bankAccountNumber !== undefined ? 
        (updates.bankAccountNumber ? encryptField(updates.bankAccountNumber) : null) : undefined,
      bankRoutingNumber: updates.bankRoutingNumber !== undefined ? 
        (updates.bankRoutingNumber ? encryptField(updates.bankRoutingNumber) : null) : undefined,
      updatedAt: new Date(),
    };
    
    const [updated] = await db.update(employees)
      .set(encryptedUpdates)
      .where(eq(employees.id, id))
      .returning();
    
    // Decrypt before returning
    return {
      ...updated,
      bankAccountNumber: updated.bankAccountNumber ? decryptField(updated.bankAccountNumber) : null,
      bankRoutingNumber: updated.bankRoutingNumber ? decryptField(updated.bankRoutingNumber) : null,
    };
  }

  async deleteEmployee(id: number): Promise<void> {
    await db.delete(employees).where(eq(employees.id, id));
  }

  // Deduction operations
  async getDeductions(organizationId: number): Promise<Deduction[]> {
    return await db.select().from(deductions).where(eq(deductions.organizationId, organizationId)).orderBy(deductions.name);
  }

  async getDeduction(id: number): Promise<Deduction | undefined> {
    const [deduction] = await db.select().from(deductions).where(eq(deductions.id, id));
    return deduction;
  }

  async getActiveDeductions(organizationId: number): Promise<Deduction[]> {
    return await db.select().from(deductions).where(
      and(eq(deductions.organizationId, organizationId), eq(deductions.isActive, 1))
    ).orderBy(deductions.name);
  }

  async createDeduction(deduction: InsertDeduction): Promise<Deduction> {
    const [newDeduction] = await db.insert(deductions).values(deduction).returning();
    return newDeduction;
  }

  async updateDeduction(id: number, updates: Partial<InsertDeduction>): Promise<Deduction> {
    const [updated] = await db.update(deductions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(deductions.id, id))
      .returning();
    return updated;
  }

  async deleteDeduction(id: number): Promise<void> {
    await db.delete(deductions).where(eq(deductions.id, id));
  }

  // Payroll run operations
  async getPayrollRuns(organizationId: number): Promise<PayrollRun[]> {
    return await db.select().from(payrollRuns).where(eq(payrollRuns.organizationId, organizationId)).orderBy(desc(payrollRuns.payDate));
  }

  async getPayrollRun(id: number): Promise<PayrollRun | undefined> {
    const [payrollRun] = await db.select().from(payrollRuns).where(eq(payrollRuns.id, id));
    return payrollRun;
  }

  async createPayrollRun(payrollRun: InsertPayrollRun): Promise<PayrollRun> {
    const [newPayrollRun] = await db.insert(payrollRuns).values(payrollRun).returning();
    return newPayrollRun;
  }

  async updatePayrollRun(id: number, updates: Partial<InsertPayrollRun>): Promise<PayrollRun> {
    const [updated] = await db.update(payrollRuns)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(payrollRuns.id, id))
      .returning();
    return updated;
  }

  async deletePayrollRun(id: number): Promise<void> {
    await db.delete(payrollRuns).where(eq(payrollRuns.id, id));
  }

  async processPayrollRun(id: number, userId: string): Promise<PayrollRun> {
    // Update the payroll run to processed status
    const [updated] = await db.update(payrollRuns)
      .set({ 
        status: 'processed',
        processedBy: userId,
        processedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(payrollRuns.id, id))
      .returning();
    
    return updated;
  }

  // Payroll item operations
  async getPayrollItems(payrollRunId: number): Promise<Array<PayrollItem & { employeeName: string; employeeNumber: string | null }>> {
    const items = await db.select({
      id: payrollItems.id,
      payrollRunId: payrollItems.payrollRunId,
      employeeId: payrollItems.employeeId,
      hoursWorked: payrollItems.hoursWorked,
      grossPay: payrollItems.grossPay,
      totalDeductions: payrollItems.totalDeductions,
      netPay: payrollItems.netPay,
      notes: payrollItems.notes,
      createdAt: payrollItems.createdAt,
      employeeName: sql<string>`CONCAT(${employees.firstName}, ' ', ${employees.lastName})`,
      employeeNumber: employees.employeeNumber,
    })
    .from(payrollItems)
    .innerJoin(employees, eq(payrollItems.employeeId, employees.id))
    .where(eq(payrollItems.payrollRunId, payrollRunId))
    .orderBy(employees.lastName, employees.firstName);

    return items;
  }

  async getPayrollItem(id: number): Promise<PayrollItem | undefined> {
    const [item] = await db.select().from(payrollItems).where(eq(payrollItems.id, id));
    return item;
  }

  async createPayrollItem(payrollItem: InsertPayrollItem): Promise<PayrollItem> {
    const [newItem] = await db.insert(payrollItems).values(payrollItem).returning();
    return newItem;
  }

  async updatePayrollItem(id: number, updates: Partial<InsertPayrollItem>): Promise<PayrollItem> {
    const [updated] = await db.update(payrollItems)
      .set(updates)
      .where(eq(payrollItems.id, id))
      .returning();
    return updated;
  }

  async deletePayrollItem(id: number): Promise<void> {
    await db.delete(payrollItems).where(eq(payrollItems.id, id));
  }

  async getPayrollItemDeductions(payrollItemId: number): Promise<Array<PayrollItemDeduction & { deductionName: string }>> {
    const itemDeductions = await db.select({
      id: payrollItemDeductions.id,
      payrollItemId: payrollItemDeductions.payrollItemId,
      deductionId: payrollItemDeductions.deductionId,
      amount: payrollItemDeductions.amount,
      createdAt: payrollItemDeductions.createdAt,
      deductionName: deductions.name,
    })
    .from(payrollItemDeductions)
    .innerJoin(deductions, eq(payrollItemDeductions.deductionId, deductions.id))
    .where(eq(payrollItemDeductions.payrollItemId, payrollItemId))
    .orderBy(deductions.name);

    return itemDeductions;
  }

  async createPayrollItemDeduction(deduction: InsertPayrollItemDeduction): Promise<PayrollItemDeduction> {
    const [newDeduction] = await db.insert(payrollItemDeductions).values(deduction).returning();
    return newDeduction;
  }

  async deletePayrollItemDeduction(id: number): Promise<void> {
    await db.delete(payrollItemDeductions).where(eq(payrollItemDeductions.id, id));
  }

  // ============================================
  // NONPROFIT-SPECIFIC IMPLEMENTATIONS
  // ============================================

  // Fund operations
  async getFunds(organizationId: number): Promise<Fund[]> {
    const fundList = await db.select().from(funds)
      .where(eq(funds.organizationId, organizationId))
      .orderBy(funds.name);
    return fundList;
  }

  async getFund(id: number): Promise<Fund | undefined> {
    const [fund] = await db.select().from(funds).where(eq(funds.id, id));
    return fund;
  }

  async createFund(fund: InsertFund): Promise<Fund> {
    const [newFund] = await db.insert(funds).values(fund).returning();
    return newFund;
  }

  async updateFund(id: number, updates: Partial<InsertFund>): Promise<Fund> {
    const [updated] = await db.update(funds)
      .set({...updates, updatedAt: new Date()})
      .where(eq(funds.id, id))
      .returning();
    return updated;
  }

  async deleteFund(id: number): Promise<void> {
    await db.delete(funds).where(eq(funds.id, id));
  }

  async updateFundBalance(fundId: number, amount: string, isIncrease: boolean): Promise<Fund> {
    const fund = await this.getFund(fundId);
    if (!fund) throw new Error('Fund not found');

    const currentBalance = parseFloat(fund.currentBalance);
    const changeAmount = parseFloat(amount);
    const newBalance = isIncrease ? currentBalance + changeAmount : currentBalance - changeAmount;

    return this.updateFund(fundId, { currentBalance: newBalance.toFixed(2) });
  }

  async getFundTransactions(fundId: number): Promise<Transaction[]> {
    const txns = await db.select().from(transactions)
      .where(eq(transactions.fundId, fundId))
      .orderBy(desc(transactions.date));
    return txns;
  }

  async getFundAccountingSummary(organizationId: number): Promise<{
    bankBalance: number;
    grantFunding: number;
    grantSpending: number;
    restrictedFunds: number;
    generalFund: number;
  }> {
    // Fund Accounting Logic:
    // 1. Bank Balance = Total of all connected bank account balances
    // 2. Restricted Funds = Grant amounts - Grant spending (remaining grant funds)
    // 3. General Fund = Bank Balance - Restricted Funds (what's available for general use)
    
    // 1. Get total bank balance from all connected Plaid accounts for this organization
    const bankBalanceResult = await db.select({
      totalBalance: sql<string>`COALESCE(SUM(${plaidAccounts.currentBalance}), 0)`,
    })
      .from(plaidAccounts)
      .innerJoin(plaidItems, eq(plaidAccounts.plaidItemId, plaidItems.id))
      .where(eq(plaidItems.organizationId, organizationId));
    
    const bankBalance = parseFloat(bankBalanceResult[0]?.totalBalance || '0');

    // 2. Get total grant amounts (the funding received/awarded)
    const grantTotals = await db.select({
      totalGrantAmount: sql<string>`COALESCE(SUM(${grants.amount}), 0)`,
    })
      .from(grants)
      .where(eq(grants.organizationId, organizationId));
    
    const grantFunding = parseFloat(grantTotals[0]?.totalGrantAmount || '0');

    // 3. Get expenses against grants (grant spending)
    const grantExpenseResult = await db.select({
      totalExpenses: sql<string>`COALESCE(SUM(${transactions.amount}), 0)`,
    })
      .from(transactions)
      .where(and(
        eq(transactions.organizationId, organizationId),
        eq(transactions.type, 'expense'),
        isNotNull(transactions.grantId)
      ));
    
    const grantSpending = parseFloat(grantExpenseResult[0]?.totalExpenses || '0');

    // Calculate restricted funds = remaining grant funds
    const restrictedFunds = grantFunding - grantSpending;
    
    // Calculate general fund = bank balance - restricted funds
    const generalFund = bankBalance - restrictedFunds;

    return {
      bankBalance,
      grantFunding,
      grantSpending,
      restrictedFunds,
      generalFund,
    };
  }

  // Program operations
  async getPrograms(organizationId: number): Promise<Program[]> {
    const programList = await db.select().from(programs)
      .where(eq(programs.organizationId, organizationId))
      .orderBy(programs.name);
    return programList;
  }

  async getProgram(id: number): Promise<Program | undefined> {
    const [program] = await db.select().from(programs).where(eq(programs.id, id));
    return program;
  }

  async createProgram(program: InsertProgram): Promise<Program> {
    const [newProgram] = await db.insert(programs).values(program).returning();
    return newProgram;
  }

  async updateProgram(id: number, updates: Partial<InsertProgram>): Promise<Program> {
    const [updated] = await db.update(programs)
      .set({...updates, updatedAt: new Date()})
      .where(eq(programs.id, id))
      .returning();
    return updated;
  }

  async deleteProgram(id: number): Promise<void> {
    await db.delete(programs).where(eq(programs.id, id));
  }

  async getProgramExpenses(programId: number, startDate?: Date, endDate?: Date): Promise<Array<Transaction & { totalAmount: string }>> {
    let query = db.select().from(transactions)
      .where(eq(transactions.programId, programId));

    if (startDate && endDate) {
      query = query.where(and(
        gte(transactions.date, startDate),
        lte(transactions.date, endDate)
      ));
    }

    const expenses = await query.orderBy(desc(transactions.date));
    
    // Calculate total
    const total = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);

    return expenses.map(exp => ({
      ...exp,
      totalAmount: total.toFixed(2)
    }));
  }

  // Program Budget vs Actual analysis
  async getProgramBudgetVsActual(organizationId: number, startDate?: Date, endDate?: Date): Promise<Array<{
    programId: number;
    programName: string;
    budget: string;
    actual: string;
    variance: string;
    percentUsed: number;
    status: 'under_budget' | 'on_track' | 'over_budget';
  }>> {
    // Get all programs for organization
    const programList = await db.select().from(programs)
      .where(eq(programs.organizationId, organizationId));

    const results = await Promise.all(programList.map(async (program) => {
      // Get actual spending for this program
      let query = db.select({ total: sql<string>`COALESCE(SUM(CAST(amount AS NUMERIC)), 0)` })
        .from(transactions)
        .where(and(
          eq(transactions.programId, program.id),
          eq(transactions.type, 'expense')
        ));

      if (startDate && endDate) {
        query = query.where(and(
          gte(transactions.date, startDate),
          lte(transactions.date, endDate)
        ));
      }

      const [actualResult] = await query;
      const actual = parseFloat(actualResult?.total || '0');
      const budget = parseFloat(program.budget || '0');
      const variance = budget - actual;
      const percentUsed = budget > 0 ? (actual / budget) * 100 : 0;

      let status: 'under_budget' | 'on_track' | 'over_budget';
      if (percentUsed > 100) {
        status = 'over_budget';
      } else if (percentUsed >= 80) {
        status = 'on_track';
      } else {
        status = 'under_budget';
      }

      return {
        programId: program.id,
        programName: program.name,
        budget: budget.toFixed(2),
        actual: actual.toFixed(2),
        variance: variance.toFixed(2),
        percentUsed: Math.round(percentUsed * 100) / 100,
        status,
      };
    }));

    return results;
  }

  // Mileage Rate operations
  async getMileageRates(organizationId: number): Promise<MileageRate[]> {
    return await db.select().from(mileageRates)
      .where(eq(mileageRates.organizationId, organizationId))
      .orderBy(desc(mileageRates.effectiveDate));
  }

  async getMileageRate(id: number): Promise<MileageRate | undefined> {
    const [rate] = await db.select().from(mileageRates).where(eq(mileageRates.id, id));
    return rate;
  }

  async createMileageRate(rate: InsertMileageRate): Promise<MileageRate> {
    const [newRate] = await db.insert(mileageRates).values(rate).returning();
    return newRate;
  }

  async updateMileageRate(id: number, updates: Partial<InsertMileageRate>): Promise<MileageRate> {
    const [updated] = await db.update(mileageRates)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(mileageRates.id, id))
      .returning();
    return updated;
  }

  async deleteMileageRate(id: number): Promise<void> {
    await db.delete(mileageRates).where(eq(mileageRates.id, id));
  }

  async getDefaultMileageRate(organizationId: number, rateType: string = 'business'): Promise<MileageRate | undefined> {
    const [rate] = await db.select().from(mileageRates)
      .where(and(
        eq(mileageRates.organizationId, organizationId),
        eq(mileageRates.isDefault, true),
        eq(mileageRates.rateType, rateType)
      ))
      .limit(1);
    return rate;
  }

  // Mileage Expense operations
  async getMileageExpenses(organizationId: number, filters?: { userId?: string; status?: string; startDate?: Date; endDate?: Date }): Promise<MileageExpense[]> {
    let conditions = [eq(mileageExpenses.organizationId, organizationId)];
    
    if (filters?.userId) {
      conditions.push(eq(mileageExpenses.userId, filters.userId));
    }
    if (filters?.status) {
      conditions.push(eq(mileageExpenses.status, filters.status));
    }
    if (filters?.startDate) {
      conditions.push(gte(mileageExpenses.tripDate, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(mileageExpenses.tripDate, filters.endDate));
    }

    return await db.select().from(mileageExpenses)
      .where(and(...conditions))
      .orderBy(desc(mileageExpenses.tripDate));
  }

  async getMileageExpense(id: number): Promise<MileageExpense | undefined> {
    const [expense] = await db.select().from(mileageExpenses).where(eq(mileageExpenses.id, id));
    return expense;
  }

  async createMileageExpense(expense: InsertMileageExpense): Promise<MileageExpense> {
    // Calculate total amount
    const miles = parseFloat(expense.miles as string);
    const rate = parseFloat(expense.rateApplied as string);
    const multiplier = expense.roundTrip ? 2 : 1;
    const totalAmount = (miles * rate * multiplier).toFixed(2);

    const [newExpense] = await db.insert(mileageExpenses).values({
      ...expense,
      totalAmount,
    }).returning();
    return newExpense;
  }

  async updateMileageExpense(id: number, updates: Partial<InsertMileageExpense>): Promise<MileageExpense> {
    const [updated] = await db.update(mileageExpenses)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(mileageExpenses.id, id))
      .returning();
    return updated;
  }

  async deleteMileageExpense(id: number): Promise<void> {
    await db.delete(mileageExpenses).where(eq(mileageExpenses.id, id));
  }

  async approveMileageExpense(id: number, approvedBy: string): Promise<MileageExpense> {
    const [updated] = await db.update(mileageExpenses)
      .set({
        status: 'approved',
        approvedBy,
        approvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(mileageExpenses.id, id))
      .returning();
    return updated;
  }

  async rejectMileageExpense(id: number, approvedBy: string, notes?: string): Promise<MileageExpense> {
    const [updated] = await db.update(mileageExpenses)
      .set({
        status: 'rejected',
        approvedBy,
        approvedAt: new Date(),
        notes: notes || null,
        updatedAt: new Date(),
      })
      .where(eq(mileageExpenses.id, id))
      .returning();
    return updated;
  }

  // Per Diem Rate operations
  async getPerDiemRates(organizationId: number): Promise<PerDiemRate[]> {
    return await db.select().from(perDiemRates)
      .where(eq(perDiemRates.organizationId, organizationId))
      .orderBy(perDiemRates.location);
  }

  async getPerDiemRate(id: number): Promise<PerDiemRate | undefined> {
    const [rate] = await db.select().from(perDiemRates).where(eq(perDiemRates.id, id));
    return rate;
  }

  async createPerDiemRate(rate: InsertPerDiemRate): Promise<PerDiemRate> {
    const [newRate] = await db.insert(perDiemRates).values(rate).returning();
    return newRate;
  }

  async updatePerDiemRate(id: number, updates: Partial<InsertPerDiemRate>): Promise<PerDiemRate> {
    const [updated] = await db.update(perDiemRates)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(perDiemRates.id, id))
      .returning();
    return updated;
  }

  async deletePerDiemRate(id: number): Promise<void> {
    await db.delete(perDiemRates).where(eq(perDiemRates.id, id));
  }

  async getPerDiemRateByLocation(organizationId: number, location: string): Promise<PerDiemRate | undefined> {
    const [rate] = await db.select().from(perDiemRates)
      .where(and(
        eq(perDiemRates.organizationId, organizationId),
        sql`LOWER(${perDiemRates.location}) LIKE LOWER(${'%' + location + '%'})`
      ))
      .limit(1);
    return rate;
  }

  // Per Diem Expense operations
  async getPerDiemExpenses(organizationId: number, filters?: { userId?: string; status?: string; startDate?: Date; endDate?: Date }): Promise<PerDiemExpense[]> {
    let conditions = [eq(perDiemExpenses.organizationId, organizationId)];
    
    if (filters?.userId) {
      conditions.push(eq(perDiemExpenses.userId, filters.userId));
    }
    if (filters?.status) {
      conditions.push(eq(perDiemExpenses.status, filters.status));
    }
    if (filters?.startDate) {
      conditions.push(gte(perDiemExpenses.travelDate, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(perDiemExpenses.travelDate, filters.endDate));
    }

    return await db.select().from(perDiemExpenses)
      .where(and(...conditions))
      .orderBy(desc(perDiemExpenses.travelDate));
  }

  async getPerDiemExpense(id: number): Promise<PerDiemExpense | undefined> {
    const [expense] = await db.select().from(perDiemExpenses).where(eq(perDiemExpenses.id, id));
    return expense;
  }

  async createPerDiemExpense(expense: InsertPerDiemExpense): Promise<PerDiemExpense> {
    const [newExpense] = await db.insert(perDiemExpenses).values(expense).returning();
    return newExpense;
  }

  async updatePerDiemExpense(id: number, updates: Partial<InsertPerDiemExpense>): Promise<PerDiemExpense> {
    const [updated] = await db.update(perDiemExpenses)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(perDiemExpenses.id, id))
      .returning();
    return updated;
  }

  async deletePerDiemExpense(id: number): Promise<void> {
    await db.delete(perDiemExpenses).where(eq(perDiemExpenses.id, id));
  }

  async approvePerDiemExpense(id: number, approvedBy: string): Promise<PerDiemExpense> {
    const [updated] = await db.update(perDiemExpenses)
      .set({
        status: 'approved',
        approvedBy,
        approvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(perDiemExpenses.id, id))
      .returning();
    return updated;
  }

  async rejectPerDiemExpense(id: number, approvedBy: string, notes?: string): Promise<PerDiemExpense> {
    const [updated] = await db.update(perDiemExpenses)
      .set({
        status: 'rejected',
        approvedBy,
        approvedAt: new Date(),
        notes: notes || null,
        updatedAt: new Date(),
      })
      .where(eq(perDiemExpenses.id, id))
      .returning();
    return updated;
  }

  // Pledge operations
  async getPledges(organizationId: number): Promise<Array<Pledge & { donorName: string }>> {
    const pledgeList = await db.select({
      id: pledges.id,
      organizationId: pledges.organizationId,
      donorId: pledges.donorId,
      fundId: pledges.fundId,
      amount: pledges.amount,
      pledgeDate: pledges.pledgeDate,
      dueDate: pledges.dueDate,
      status: pledges.status,
      amountPaid: pledges.amountPaid,
      notes: pledges.notes,
      paymentSchedule: pledges.paymentSchedule,
      createdAt: pledges.createdAt,
      updatedAt: pledges.updatedAt,
      donorName: donors.name,
    })
    .from(pledges)
    .innerJoin(donors, eq(pledges.donorId, donors.id))
    .where(eq(pledges.organizationId, organizationId))
    .orderBy(desc(pledges.pledgeDate));

    return pledgeList;
  }

  async getPledge(id: number): Promise<Pledge | undefined> {
    const [pledge] = await db.select().from(pledges).where(eq(pledges.id, id));
    return pledge;
  }

  async getPledgesByDonor(donorId: number): Promise<Pledge[]> {
    const pledgeList = await db.select().from(pledges)
      .where(eq(pledges.donorId, donorId))
      .orderBy(desc(pledges.pledgeDate));
    return pledgeList;
  }

  async getOverduePledges(organizationId: number): Promise<Array<Pledge & { donorName: string }>> {
    const today = new Date();
    const overduePledgeList = await db.select({
      id: pledges.id,
      organizationId: pledges.organizationId,
      donorId: pledges.donorId,
      fundId: pledges.fundId,
      amount: pledges.amount,
      pledgeDate: pledges.pledgeDate,
      dueDate: pledges.dueDate,
      status: pledges.status,
      amountPaid: pledges.amountPaid,
      notes: pledges.notes,
      paymentSchedule: pledges.paymentSchedule,
      createdAt: pledges.createdAt,
      updatedAt: pledges.updatedAt,
      donorName: donors.name,
    })
    .from(pledges)
    .innerJoin(donors, eq(pledges.donorId, donors.id))
    .where(and(
      eq(pledges.organizationId, organizationId),
      lte(pledges.dueDate, today),
      sql`${pledges.status} != 'fulfilled' AND ${pledges.status} != 'cancelled'`
    ))
    .orderBy(pledges.dueDate);

    return overduePledgeList;
  }

  async createPledge(pledge: InsertPledge): Promise<Pledge> {
    const [newPledge] = await db.insert(pledges).values(pledge).returning();
    return newPledge;
  }

  async updatePledge(id: number, updates: Partial<InsertPledge>): Promise<Pledge> {
    const [updated] = await db.update(pledges)
      .set({...updates, updatedAt: new Date()})
      .where(eq(pledges.id, id))
      .returning();
    return updated;
  }

  async deletePledge(id: number): Promise<void> {
    await db.delete(pledges).where(eq(pledges.id, id));
  }

  async recordPledgePayment(pledgeId: number, payment: InsertPledgePayment): Promise<{ pledge: Pledge; payment: PledgePayment }> {
    // Create the payment record
    const [newPayment] = await db.insert(pledgePayments).values(payment).returning();

    // Update pledge amount paid
    const pledge = await this.getPledge(pledgeId);
    if (!pledge) throw new Error('Pledge not found');

    const newAmountPaid = (parseFloat(pledge.amountPaid) + parseFloat(payment.amount)).toFixed(2);
    const totalAmount = parseFloat(pledge.amount);
    const paidAmount = parseFloat(newAmountPaid);

    // Determine new status
    let newStatus = pledge.status;
    if (paidAmount >= totalAmount) {
      newStatus = 'fulfilled';
    } else if (paidAmount > 0) {
      newStatus = 'partial';
    }

    const updatedPledge = await this.updatePledge(pledgeId, {
      amountPaid: newAmountPaid,
      status: newStatus,
    });

    return { pledge: updatedPledge, payment: newPayment };
  }

  // Pledge payment operations
  async getPledgePayments(pledgeId: number): Promise<PledgePayment[]> {
    const payments = await db.select().from(pledgePayments)
      .where(eq(pledgePayments.pledgeId, pledgeId))
      .orderBy(desc(pledgePayments.paymentDate));
    return payments;
  }

  async getPledgePayment(id: number): Promise<PledgePayment | undefined> {
    const [payment] = await db.select().from(pledgePayments).where(eq(pledgePayments.id, id));
    return payment;
  }

  async deletePledgePayment(id: number): Promise<void> {
    // When deleting a payment, we should also update the pledge's amountPaid
    const payment = await this.getPledgePayment(id);
    if (payment) {
      const pledge = await this.getPledge(payment.pledgeId);
      if (pledge) {
        const newAmountPaid = (parseFloat(pledge.amountPaid) - parseFloat(payment.amount)).toFixed(2);
        await this.updatePledge(payment.pledgeId, { amountPaid: newAmountPaid });
      }
    }

    await db.delete(pledgePayments).where(eq(pledgePayments.id, id));
  }

  // Donor Portal Access Token operations
  async createDonorAccessToken(donorId: number, organizationId: number): Promise<DonorAccessToken> {
    // Generate a secure random token
    const crypto = await import('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    
    // Token expires in 7 days
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    
    const [newToken] = await db.insert(donorAccessTokens).values({
      donorId,
      organizationId,
      token,
      expiresAt,
    }).returning();
    
    return newToken;
  }

  async getDonorByAccessToken(token: string): Promise<{ donor: Donor; organizationId: number } | undefined> {
    const [result] = await db.select({
      tokenData: donorAccessTokens,
      donor: donors,
    })
      .from(donorAccessTokens)
      .innerJoin(donors, eq(donorAccessTokens.donorId, donors.id))
      .where(and(
        eq(donorAccessTokens.token, token),
        gt(donorAccessTokens.expiresAt, new Date())
      ));
    
    if (!result) return undefined;
    
    // Decrypt sensitive fields
    const decryptedDonor = {
      ...result.donor,
      taxId: result.donor.taxId ? decryptField(result.donor.taxId) : null,
    };
    
    return { donor: decryptedDonor, organizationId: result.tokenData.organizationId };
  }

  async markDonorAccessTokenUsed(token: string): Promise<void> {
    await db.update(donorAccessTokens)
      .set({ usedAt: new Date() })
      .where(eq(donorAccessTokens.token, token));
  }

  async getDonorPortalData(donorId: number): Promise<{
    donor: Donor;
    pledges: Pledge[];
    donationHistory: Transaction[];
    letters: DonorLetter[];
    organization: Organization;
  }> {
    const donor = await this.getDonor(donorId);
    if (!donor) {
      throw new Error('Donor not found');
    }

    const organization = await this.getOrganization(donor.organizationId);
    if (!organization) {
      throw new Error('Organization not found');
    }

    const pledgeList = await this.getPledgesByDonor(donorId);
    
    // Get donation history (transactions linked to this donor)
    const donationHistory = await db.select()
      .from(transactions)
      .where(and(
        eq(transactions.donorId, donorId),
        eq(transactions.type, 'income')
      ))
      .orderBy(desc(transactions.date));

    // Get donor letters
    const letterResults = await db.select()
      .from(donorLetters)
      .where(eq(donorLetters.donorId, donorId))
      .orderBy(desc(donorLetters.year));

    return {
      donor,
      pledges: pledgeList,
      donationHistory,
      letters: letterResults,
      organization,
    };
  }

  // Enhanced grant operations
  async getGrant(id: number): Promise<Grant | undefined> {
    const [grant] = await db.select().from(grants).where(eq(grants.id, id));
    return grant;
  }

  async updateGrant(id: number, updates: Partial<InsertGrant>): Promise<Grant> {
    const [updated] = await db.update(grants)
      .set({...updates, updatedAt: new Date()})
      .where(eq(grants.id, id))
      .returning();
    return updated;
  }

  async deleteGrant(id: number): Promise<void> {
    await db.delete(grants).where(eq(grants.id, id));
  }

  async getGrantsWithUpcomingDeadlines(organizationId: number, daysAhead: number): Promise<Grant[]> {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + daysAhead);

    const upcomingGrants = await db.select().from(grants)
      .where(and(
        eq(grants.organizationId, organizationId),
        gte(grants.nextReportDueDate, today),
        lte(grants.nextReportDueDate, futureDate)
      ))
      .orderBy(grants.nextReportDueDate);

    return upcomingGrants;
  }

  async updateGrantCompliance(id: number, status: 'compliant' | 'at_risk' | 'non_compliant' | 'pending_review', notes?: string): Promise<Grant> {
    const updates: any = { complianceStatus: status, updatedAt: new Date() };
    if (notes) {
      updates.complianceNotes = notes;
    }

    const [updated] = await db.update(grants)
      .set(updates)
      .where(eq(grants.id, id))
      .returning();

    return updated;
  }

  // Functional expense reporting
  async getFunctionalExpenseReport(organizationId: number, startDate: Date, endDate: Date) {
    // Get all expenses in the date range
    const expenses = await db.select().from(transactions)
      .where(and(
        eq(transactions.organizationId, organizationId),
        eq(transactions.type, 'expense'),
        gte(transactions.date, startDate),
        lte(transactions.date, endDate)
      ));

    // Calculate totals by functional category
    let programExpenses = 0;
    let administrativeExpenses = 0;
    let fundraisingExpenses = 0;

    expenses.forEach(exp => {
      const amount = parseFloat(exp.amount);
      if (exp.functionalCategory === 'program') {
        programExpenses += amount;
      } else if (exp.functionalCategory === 'administrative') {
        administrativeExpenses += amount;
      } else if (exp.functionalCategory === 'fundraising') {
        fundraisingExpenses += amount;
      }
    });

    const totalExpenses = programExpenses + administrativeExpenses + fundraisingExpenses;

    // Calculate percentages
    const programPercentage = totalExpenses > 0 ? (programExpenses / totalExpenses) * 100 : 0;
    const administrativePercentage = totalExpenses > 0 ? (administrativeExpenses / totalExpenses) * 100 : 0;
    const fundraisingPercentage = totalExpenses > 0 ? (fundraisingExpenses / totalExpenses) * 100 : 0;

    // Get expenses by program
    const programExpenseData = await db.select({
      programId: transactions.programId,
      programName: programs.name,
      amount: sql<string>`SUM(${transactions.amount})`,
    })
    .from(transactions)
    .leftJoin(programs, eq(transactions.programId, programs.id))
    .where(and(
      eq(transactions.organizationId, organizationId),
      eq(transactions.type, 'expense'),
      gte(transactions.date, startDate),
      lte(transactions.date, endDate),
      sql`${transactions.programId} IS NOT NULL`
    ))
    .groupBy(transactions.programId, programs.name);

    // Get expenses by category and functional type
    const categoryExpenseData = await db.select({
      functionalCategory: transactions.functionalCategory,
      categoryName: categories.name,
      amount: sql<string>`SUM(${transactions.amount})`,
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(and(
      eq(transactions.organizationId, organizationId),
      eq(transactions.type, 'expense'),
      gte(transactions.date, startDate),
      lte(transactions.date, endDate)
    ))
    .groupBy(transactions.functionalCategory, categories.name);

    return {
      programExpenses: programExpenses.toFixed(2),
      administrativeExpenses: administrativeExpenses.toFixed(2),
      fundraisingExpenses: fundraisingExpenses.toFixed(2),
      totalExpenses: totalExpenses.toFixed(2),
      programPercentage: Math.round(programPercentage * 100) / 100,
      administrativePercentage: Math.round(administrativePercentage * 100) / 100,
      fundraisingPercentage: Math.round(fundraisingPercentage * 100) / 100,
      expensesByProgram: programExpenseData.map(row => ({
        programId: row.programId || 0,
        programName: row.programName || 'Unknown',
        amount: row.amount || '0.00',
      })),
      expensesByCategory: categoryExpenseData.map(row => ({
        functionalCategory: row.functionalCategory || 'Unknown',
        categoryName: row.categoryName || 'Uncategorized',
        amount: row.amount || '0.00',
      })),
    };
  }

  // Form 990 reporting
  async getForm990Data(organizationId: number, taxYear: number) {
    const yearStart = new Date(taxYear, 0, 1);
    const yearEnd = new Date(taxYear, 11, 31);

    // Get all transactions for the year
    const allTransactions = await db.select().from(transactions)
      .where(and(
        eq(transactions.organizationId, organizationId),
        gte(transactions.date, yearStart),
        lte(transactions.date, yearEnd)
      ));

    // Calculate revenue (income transactions)
    const incomeTransactions = allTransactions.filter(t => t.type === 'income');
    const totalRevenue = incomeTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);

    // Calculate expenses by functional category
    const expenseTransactions = allTransactions.filter(t => t.type === 'expense');
    let programServiceExpenses = 0;
    let managementExpenses = 0;
    let fundraisingExpenses = 0;

    expenseTransactions.forEach(exp => {
      const amount = parseFloat(exp.amount);
      if (exp.functionalCategory === 'program') {
        programServiceExpenses += amount;
      } else if (exp.functionalCategory === 'administrative') {
        managementExpenses += amount;
      } else if (exp.functionalCategory === 'fundraising') {
        fundraisingExpenses += amount;
      }
    });

    const totalExpenses = programServiceExpenses + managementExpenses + fundraisingExpenses;

    // Get balance sheet data (simplified - would need proper asset/liability tracking)
    const totalAssets = '0.00'; // Placeholder
    const totalLiabilities = '0.00'; // Placeholder
    const netAssets = (totalRevenue - totalExpenses).toFixed(2);

    // Revenue by source (by category)
    const revenueBySource = await db.select({
      source: categories.name,
      amount: sql<string>`SUM(${transactions.amount})`,
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(and(
      eq(transactions.organizationId, organizationId),
      eq(transactions.type, 'income'),
      gte(transactions.date, yearStart),
      lte(transactions.date, yearEnd)
    ))
    .groupBy(categories.name);

    // Expenses by function
    const expensesByFunction = [
      { function: 'Program Services', amount: programServiceExpenses.toFixed(2) },
      { function: 'Management & General', amount: managementExpenses.toFixed(2) },
      { function: 'Fundraising', amount: fundraisingExpenses.toFixed(2) },
    ];

    // Get grants received
    const grantsReceived = await db.select().from(grants)
      .where(and(
        eq(grants.organizationId, organizationId),
        gte(grants.startDate, yearStart),
        lte(grants.startDate, yearEnd)
      ));

    return {
      totalRevenue: totalRevenue.toFixed(2),
      totalExpenses: totalExpenses.toFixed(2),
      programServiceExpenses: programServiceExpenses.toFixed(2),
      managementExpenses: managementExpenses.toFixed(2),
      fundraisingExpenses: fundraisingExpenses.toFixed(2),
      totalAssets,
      totalLiabilities,
      netAssets,
      revenueBySource: revenueBySource.map(row => ({
        source: row.source || 'Other',
        amount: row.amount || '0.00',
      })),
      expensesByFunction,
      grants: grantsReceived.map(g => ({
        grantorName: g.name,
        amount: g.amount,
        purpose: g.restrictions || 'General support',
      })),
    };
  }

  // ===================================================================
  // GOVERNMENT CONTRACTS (For-Profit)
  // ===================================================================

  // Contract operations
  async getContracts(organizationId: number): Promise<Contract[]> {
    return await db.select().from(contracts)
      .where(eq(contracts.organizationId, organizationId))
      .orderBy(desc(contracts.createdAt));
  }

  async getContract(id: number): Promise<Contract | undefined> {
    const [contract] = await db.select().from(contracts).where(eq(contracts.id, id));
    return contract;
  }

  async getContractsByProposalId(proposalId: number, organizationId: number): Promise<Contract[]> {
    return await db.select().from(contracts)
      .where(and(eq(contracts.proposalId, proposalId), eq(contracts.organizationId, organizationId)))
      .orderBy(desc(contracts.createdAt));
  }

  async createContract(contract: InsertContract): Promise<Contract> {
    const [newContract] = await db.insert(contracts).values(contract).returning();
    return newContract;
  }

  async updateContract(id: number, updates: Partial<InsertContract>): Promise<Contract> {
    const [updated] = await db.update(contracts)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(contracts.id, id))
      .returning();
    return updated;
  }

  async deleteContract(id: number): Promise<void> {
    // Cascade delete related records
    // 1. Get all projects for this contract
    const contractProjects = await db.select({ id: projects.id }).from(projects)
      .where(eq(projects.contractId, id));
    
    // 2. Delete project costs for each project
    for (const project of contractProjects) {
      await db.delete(projectCosts).where(eq(projectCosts.projectId, project.id));
      // Delete project budget breakdowns
      await db.delete(projectBudgetBreakdowns).where(eq(projectBudgetBreakdowns.projectId, project.id));
      // Delete project revenue ledger entries
      await db.delete(projectRevenueLedger).where(eq(projectRevenueLedger.projectId, project.id));
      // Delete time entries for this project
      await db.delete(timeEntries).where(eq(timeEntries.projectId, project.id));
    }
    
    // 3. Delete projects
    await db.delete(projects).where(eq(projects.contractId, id));
    
    // 4. Delete milestones
    await db.delete(contractMilestones).where(eq(contractMilestones.contractId, id));
    
    // 5. Delete change orders
    await db.delete(changeOrders).where(eq(changeOrders.contractId, id));
    
    // 6. Finally delete the contract
    await db.delete(contracts).where(eq(contracts.id, id));
  }

  async updateContractBilledAmount(id: number, amount: string): Promise<Contract> {
    const [updated] = await db.update(contracts)
      .set({ billedAmount: amount, updatedAt: new Date() })
      .where(eq(contracts.id, id))
      .returning();
    return updated;
  }

  // Document operations (for contracts, proposals, change orders)
  async getDocumentsByEntity(entityType: string, entityId: number): Promise<Document[]> {
    return await db.select().from(documents)
      .where(and(
        eq(documents.relatedEntityType, entityType),
        eq(documents.relatedEntityId, entityId)
      ))
      .orderBy(desc(documents.createdAt));
  }

  async getDocumentsByEntityWithOrg(entityType: string, entityId: number, organizationId: number): Promise<Document[]> {
    return await db.select().from(documents)
      .where(and(
        eq(documents.relatedEntityType, entityType),
        eq(documents.relatedEntityId, entityId),
        eq(documents.organizationId, organizationId)
      ))
      .orderBy(desc(documents.createdAt));
  }

  async getDocument(id: number): Promise<Document | undefined> {
    const [doc] = await db.select().from(documents).where(eq(documents.id, id));
    return doc;
  }

  async createDocument(doc: InsertDocument): Promise<Document> {
    const [newDoc] = await db.insert(documents).values(doc).returning();
    return newDoc;
  }

  async deleteDocument(id: number): Promise<void> {
    await db.delete(documents).where(eq(documents.id, id));
  }

  // Contract milestone operations
  async getContractMilestones(contractId: number): Promise<ContractMilestone[]> {
    return await db.select().from(contractMilestones)
      .where(eq(contractMilestones.contractId, contractId))
      .orderBy(contractMilestones.dueDate);
  }

  async getMilestonesByOrganization(organizationId: number): Promise<ContractMilestone[]> {
    return await db.select().from(contractMilestones)
      .where(eq(contractMilestones.organizationId, organizationId))
      .orderBy(contractMilestones.dueDate);
  }

  async getContractMilestone(id: number): Promise<ContractMilestone | undefined> {
    const [milestone] = await db.select().from(contractMilestones).where(eq(contractMilestones.id, id));
    return milestone;
  }

  async createContractMilestone(milestone: InsertContractMilestone): Promise<ContractMilestone> {
    const [newMilestone] = await db.insert(contractMilestones).values(milestone).returning();
    return newMilestone;
  }

  async updateContractMilestone(id: number, updates: Partial<InsertContractMilestone>): Promise<ContractMilestone> {
    const [updated] = await db.update(contractMilestones)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(contractMilestones.id, id))
      .returning();
    return updated;
  }

  async deleteContractMilestone(id: number): Promise<void> {
    await db.delete(contractMilestones).where(eq(contractMilestones.id, id));
  }

  async completeMilestone(id: number, completedDate: Date): Promise<ContractMilestone> {
    const [updated] = await db.update(contractMilestones)
      .set({ status: 'completed', completedDate, updatedAt: new Date() })
      .where(eq(contractMilestones.id, id))
      .returning();
    return updated;
  }

  // Project (Job Costing) operations
  async getProjects(organizationId: number): Promise<Array<Project & { contractName?: string | null }>> {
    const projectList = await db.select({
      id: projects.id,
      organizationId: projects.organizationId,
      contractId: projects.contractId,
      projectNumber: projects.projectNumber,
      projectName: projects.projectName,
      description: projects.description,
      startDate: projects.startDate,
      endDate: projects.endDate,
      budget: projects.budget,
      actualCost: projects.actualCost,
      status: projects.status,
      projectManager: projects.projectManager,
      notes: projects.notes,
      createdBy: projects.createdBy,
      createdAt: projects.createdAt,
      updatedAt: projects.updatedAt,
      contractName: contracts.contractName,
    })
    .from(projects)
    .leftJoin(contracts, eq(projects.contractId, contracts.id))
    .where(eq(projects.organizationId, organizationId))
    .orderBy(desc(projects.createdAt));

    return projectList;
  }

  async getProject(id: number): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project;
  }

  async getProjectsByContract(contractId: number): Promise<Project[]> {
    return await db.select().from(projects)
      .where(eq(projects.contractId, contractId))
      .orderBy(desc(projects.createdAt));
  }

  async createProject(project: InsertProject): Promise<Project> {
    const [newProject] = await db.insert(projects).values(project).returning();
    return newProject;
  }

  async updateProject(id: number, updates: Partial<InsertProject>): Promise<Project> {
    const [updated] = await db.update(projects)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return updated;
  }

  async deleteProject(id: number): Promise<void> {
    await db.delete(projects).where(eq(projects.id, id));
  }

  async updateProjectActualCost(id: number, amount: string): Promise<Project> {
    const [updated] = await db.update(projects)
      .set({ actualCost: amount, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return updated;
  }

  // Project cost operations
  async getProjectCosts(projectId: number): Promise<ProjectCost[]> {
    return await db.select().from(projectCosts)
      .where(eq(projectCosts.projectId, projectId))
      .orderBy(desc(projectCosts.costDate));
  }

  async getProjectCost(id: number): Promise<ProjectCost | undefined> {
    const [cost] = await db.select().from(projectCosts).where(eq(projectCosts.id, id));
    return cost;
  }

  async createProjectCost(cost: InsertProjectCost): Promise<ProjectCost> {
    const [newCost] = await db.insert(projectCosts).values(cost).returning();
    
    // Update project actual cost
    const totalCosts = await db.select({
      total: sql<string>`COALESCE(SUM(${projectCosts.amount}), 0)`,
    })
    .from(projectCosts)
    .where(eq(projectCosts.projectId, cost.projectId));
    
    if (totalCosts[0]) {
      await this.updateProjectActualCost(cost.projectId, totalCosts[0].total);
    }
    
    return newCost;
  }

  async updateProjectCost(id: number, updates: Partial<InsertProjectCost>): Promise<ProjectCost> {
    const [updated] = await db.update(projectCosts)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(projectCosts.id, id))
      .returning();
    
    // Recalculate project actual cost
    const totalCosts = await db.select({
      total: sql<string>`COALESCE(SUM(${projectCosts.amount}), 0)`,
    })
    .from(projectCosts)
    .where(eq(projectCosts.projectId, updated.projectId));
    
    if (totalCosts[0]) {
      await this.updateProjectActualCost(updated.projectId, totalCosts[0].total);
    }
    
    return updated;
  }

  async deleteProjectCost(id: number): Promise<void> {
    const cost = await this.getProjectCost(id);
    await db.delete(projectCosts).where(eq(projectCosts.id, id));
    
    // Recalculate project actual cost
    if (cost) {
      const totalCosts = await db.select({
        total: sql<string>`COALESCE(SUM(${projectCosts.amount}), 0)`,
      })
      .from(projectCosts)
      .where(eq(projectCosts.projectId, cost.projectId));
      
      if (totalCosts[0]) {
        await this.updateProjectActualCost(cost.projectId, totalCosts[0].total);
      }
    }
  }

  async getProjectCostsByType(projectId: number): Promise<Array<{ costType: string; totalAmount: string }>> {
    return await db.select({
      costType: projectCosts.costType,
      totalAmount: sql<string>`SUM(${projectCosts.amount})`,
    })
    .from(projectCosts)
    .where(eq(projectCosts.projectId, projectId))
    .groupBy(projectCosts.costType);
  }

  // Time entry operations
  async getTimeEntries(organizationId: number, startDate?: Date, endDate?: Date): Promise<Array<TimeEntry & { userName: string; projectName?: string | null; contractName?: string | null }>> {
    let query = db.select({
      id: timeEntries.id,
      organizationId: timeEntries.organizationId,
      userId: timeEntries.userId,
      projectId: timeEntries.projectId,
      contractId: timeEntries.contractId,
      taskDescription: timeEntries.taskDescription,
      clockInTime: timeEntries.clockInTime,
      clockOutTime: timeEntries.clockOutTime,
      totalHours: timeEntries.totalHours,
      hourlyRate: timeEntries.hourlyRate,
      laborCost: timeEntries.laborCost,
      status: timeEntries.status,
      location: timeEntries.location,
      notes: timeEntries.notes,
      createdAt: timeEntries.createdAt,
      updatedAt: timeEntries.updatedAt,
      userName: sql<string>`COALESCE(${users.firstName} || ' ' || ${users.lastName}, ${users.email})`,
      projectName: projects.projectName,
      contractName: contracts.contractName,
    })
    .from(timeEntries)
    .leftJoin(users, eq(timeEntries.userId, users.id))
    .leftJoin(projects, eq(timeEntries.projectId, projects.id))
    .leftJoin(contracts, eq(timeEntries.contractId, contracts.id))
    .where(eq(timeEntries.organizationId, organizationId));

    if (startDate) {
      query = query.where(gte(timeEntries.clockInTime, startDate)) as any;
    }
    if (endDate) {
      query = query.where(lte(timeEntries.clockInTime, endDate)) as any;
    }

    const results = await query.orderBy(desc(timeEntries.clockInTime));
    return results;
  }

  async getTimeEntry(id: number): Promise<TimeEntry | undefined> {
    const [entry] = await db.select().from(timeEntries).where(eq(timeEntries.id, id));
    return entry;
  }

  async getTimeEntriesByUser(userId: string, organizationId: number, startDate?: Date, endDate?: Date): Promise<TimeEntry[]> {
    let conditions = [
      eq(timeEntries.userId, userId),
      eq(timeEntries.organizationId, organizationId)
    ];
    
    if (startDate) {
      conditions.push(gte(timeEntries.clockInTime, startDate));
    }
    if (endDate) {
      conditions.push(lte(timeEntries.clockInTime, endDate));
    }

    return await db.select().from(timeEntries)
      .where(and(...conditions))
      .orderBy(desc(timeEntries.clockInTime));
  }

  async getTimeEntriesByProject(projectId: number): Promise<TimeEntry[]> {
    return await db.select().from(timeEntries)
      .where(eq(timeEntries.projectId, projectId))
      .orderBy(desc(timeEntries.clockInTime));
  }

  async getTimeEntriesByContract(contractId: number): Promise<TimeEntry[]> {
    return await db.select().from(timeEntries)
      .where(eq(timeEntries.contractId, contractId))
      .orderBy(desc(timeEntries.clockInTime));
  }

  async createTimeEntry(entry: InsertTimeEntry): Promise<TimeEntry> {
    const entryData = { ...entry };
    
    if (entry.clockInTime && entry.clockOutTime) {
      const clockInTime = new Date(entry.clockInTime);
      const clockOutTime = new Date(entry.clockOutTime);
      const hours = (clockOutTime.getTime() - clockInTime.getTime()) / (1000 * 60 * 60);
      entryData.totalHours = hours.toFixed(2);
      
      if (entry.hourlyRate) {
        const cost = hours * parseFloat(entry.hourlyRate);
        entryData.laborCost = cost.toFixed(2);
      }
    }
    
    const [newEntry] = await db.insert(timeEntries).values(entryData).returning();
    return newEntry;
  }

  async updateTimeEntry(id: number, updates: Partial<InsertTimeEntry>): Promise<TimeEntry> {
    const entry = await this.getTimeEntry(id);
    if (!entry) throw new Error('Time entry not found');
    
    const updatedData = { ...updates, updatedAt: new Date() };
    
    const clockInTime = updates.clockInTime ? new Date(updates.clockInTime) : new Date(entry.clockInTime);
    const clockOutTime = updates.clockOutTime ? new Date(updates.clockOutTime) : (entry.clockOutTime ? new Date(entry.clockOutTime) : null);
    const hourlyRate = updates.hourlyRate ?? entry.hourlyRate;
    
    if (clockInTime && clockOutTime) {
      const hours = (clockOutTime.getTime() - clockInTime.getTime()) / (1000 * 60 * 60);
      updatedData.totalHours = hours.toFixed(2);
      
      if (hourlyRate) {
        const cost = hours * parseFloat(hourlyRate);
        updatedData.laborCost = cost.toFixed(2);
      }
    }
    
    const [updated] = await db.update(timeEntries)
      .set(updatedData)
      .where(eq(timeEntries.id, id))
      .returning();
    return updated;
  }

  async deleteTimeEntry(id: number): Promise<void> {
    await db.delete(timeEntries).where(eq(timeEntries.id, id));
  }

  async clockOut(id: number, clockOutTime: Date): Promise<TimeEntry> {
    const entry = await this.getTimeEntry(id);
    if (!entry) throw new Error('Time entry not found');
    
    const clockInTime = new Date(entry.clockInTime);
    const hours = (clockOutTime.getTime() - clockInTime.getTime()) / (1000 * 60 * 60);
    const totalHours = hours.toFixed(2);
    
    let laborCost = '0';
    if (entry.hourlyRate) {
      laborCost = (parseFloat(totalHours) * parseFloat(entry.hourlyRate)).toFixed(2);
    }

    const [updated] = await db.update(timeEntries)
      .set({ 
        clockOutTime, 
        totalHours, 
        laborCost,
        updatedAt: new Date() 
      })
      .where(eq(timeEntries.id, id))
      .returning();
    return updated;
  }

  async submitTimeEntry(id: number): Promise<TimeEntry> {
    const [updated] = await db.update(timeEntries)
      .set({ status: 'submitted', updatedAt: new Date() })
      .where(eq(timeEntries.id, id))
      .returning();
    return updated;
  }

  async approveTimeEntry(id: number): Promise<TimeEntry> {
    const [updated] = await db.update(timeEntries)
      .set({ status: 'approved', updatedAt: new Date() })
      .where(eq(timeEntries.id, id))
      .returning();
    return updated;
  }

  // Indirect cost rate operations
  async getIndirectCostRates(organizationId: number): Promise<IndirectCostRate[]> {
    return await db.select().from(indirectCostRates)
      .where(eq(indirectCostRates.organizationId, organizationId))
      .orderBy(desc(indirectCostRates.effectiveStartDate));
  }

  async getActiveIndirectCostRates(organizationId: number): Promise<IndirectCostRate[]> {
    const now = new Date();
    return await db.select().from(indirectCostRates)
      .where(and(
        eq(indirectCostRates.organizationId, organizationId),
        eq(indirectCostRates.isActive, 1),
        lte(indirectCostRates.effectiveStartDate, now)
      ))
      .orderBy(desc(indirectCostRates.effectiveStartDate));
  }

  async getIndirectCostRate(id: number): Promise<IndirectCostRate | undefined> {
    const [rate] = await db.select().from(indirectCostRates).where(eq(indirectCostRates.id, id));
    return rate;
  }

  async createIndirectCostRate(rate: InsertIndirectCostRate): Promise<IndirectCostRate> {
    const [newRate] = await db.insert(indirectCostRates).values(rate).returning();
    return newRate;
  }

  async updateIndirectCostRate(id: number, updates: Partial<InsertIndirectCostRate>): Promise<IndirectCostRate> {
    const [updated] = await db.update(indirectCostRates)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(indirectCostRates.id, id))
      .returning();
    return updated;
  }

  async deleteIndirectCostRate(id: number): Promise<void> {
    await db.delete(indirectCostRates).where(eq(indirectCostRates.id, id));
  }

  // Labor burden rate operations
  async getLaborBurdenRates(organizationId: number): Promise<LaborBurdenRate[]> {
    return await db.select().from(laborBurdenRates)
      .where(eq(laborBurdenRates.organizationId, organizationId))
      .orderBy(desc(laborBurdenRates.effectiveStartDate));
  }

  async getActiveLaborBurdenRates(organizationId: number): Promise<LaborBurdenRate[]> {
    const now = new Date();
    return await db.select().from(laborBurdenRates)
      .where(and(
        eq(laborBurdenRates.organizationId, organizationId),
        eq(laborBurdenRates.isActive, 1),
        lte(laborBurdenRates.effectiveStartDate, now),
        or(
          isNull(laborBurdenRates.effectiveEndDate),
          gte(laborBurdenRates.effectiveEndDate, now)
        )
      ))
      .orderBy(desc(laborBurdenRates.effectiveStartDate));
  }

  async getLaborBurdenRate(id: number): Promise<LaborBurdenRate | undefined> {
    const [rate] = await db.select().from(laborBurdenRates).where(eq(laborBurdenRates.id, id));
    return rate;
  }

  async createLaborBurdenRate(rate: InsertLaborBurdenRate): Promise<LaborBurdenRate> {
    const [newRate] = await db.insert(laborBurdenRates).values(rate).returning();
    return newRate;
  }

  async updateLaborBurdenRate(id: number, updates: Partial<InsertLaborBurdenRate>): Promise<LaborBurdenRate> {
    const [updated] = await db.update(laborBurdenRates)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(laborBurdenRates.id, id))
      .returning();
    return updated;
  }

  async deleteLaborBurdenRate(id: number): Promise<void> {
    await db.delete(laborBurdenRates).where(eq(laborBurdenRates.id, id));
  }

  // Billing rate operations
  async getBillingRates(organizationId: number): Promise<BillingRate[]> {
    return await db.select().from(billingRates)
      .where(eq(billingRates.organizationId, organizationId))
      .orderBy(desc(billingRates.effectiveStartDate));
  }

  async getActiveBillingRates(organizationId: number): Promise<BillingRate[]> {
    const now = new Date();
    return await db.select().from(billingRates)
      .where(and(
        eq(billingRates.organizationId, organizationId),
        eq(billingRates.isActive, 1),
        lte(billingRates.effectiveStartDate, now),
        or(
          isNull(billingRates.effectiveEndDate),
          gte(billingRates.effectiveEndDate, now)
        )
      ))
      .orderBy(desc(billingRates.effectiveStartDate));
  }

  async getBillingRate(id: number): Promise<BillingRate | undefined> {
    const [rate] = await db.select().from(billingRates).where(eq(billingRates.id, id));
    return rate;
  }

  async createBillingRate(rate: InsertBillingRate): Promise<BillingRate> {
    const [newRate] = await db.insert(billingRates).values(rate).returning();
    return newRate;
  }

  async updateBillingRate(id: number, updates: Partial<InsertBillingRate>): Promise<BillingRate> {
    const [updated] = await db.update(billingRates)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(billingRates.id, id))
      .returning();
    return updated;
  }

  async deleteBillingRate(id: number): Promise<void> {
    await db.delete(billingRates).where(eq(billingRates.id, id));
  }

  // Project budget breakdown operations
  async getProjectBudgetBreakdowns(projectId: number): Promise<ProjectBudgetBreakdown[]> {
    return await db.select().from(projectBudgetBreakdowns)
      .where(eq(projectBudgetBreakdowns.projectId, projectId))
      .orderBy(projectBudgetBreakdowns.costType);
  }

  async getProjectBudgetBreakdown(id: number): Promise<ProjectBudgetBreakdown | undefined> {
    const [breakdown] = await db.select().from(projectBudgetBreakdowns).where(eq(projectBudgetBreakdowns.id, id));
    return breakdown;
  }

  async createProjectBudgetBreakdown(breakdown: InsertProjectBudgetBreakdown): Promise<ProjectBudgetBreakdown> {
    const [newBreakdown] = await db.insert(projectBudgetBreakdowns).values(breakdown).returning();
    return newBreakdown;
  }

  async updateProjectBudgetBreakdown(id: number, updates: Partial<InsertProjectBudgetBreakdown>): Promise<ProjectBudgetBreakdown> {
    const [updated] = await db.update(projectBudgetBreakdowns)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(projectBudgetBreakdowns.id, id))
      .returning();
    return updated;
  }

  async deleteProjectBudgetBreakdown(id: number): Promise<void> {
    await db.delete(projectBudgetBreakdowns).where(eq(projectBudgetBreakdowns.id, id));
  }

  // Project revenue ledger operations
  async getProjectRevenueLedger(projectId: number, limit?: number, offset?: number): Promise<ProjectRevenueLedger[]> {
    let query = db.select().from(projectRevenueLedger)
      .where(eq(projectRevenueLedger.projectId, projectId))
      .orderBy(desc(projectRevenueLedger.revenueDate));
    
    if (limit !== undefined) {
      query = query.limit(limit);
    }
    if (offset !== undefined) {
      query = query.offset(offset);
    }
    
    return await query;
  }

  async getProjectRevenueLedgerCount(projectId: number): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)::int` })
      .from(projectRevenueLedger)
      .where(eq(projectRevenueLedger.projectId, projectId));
    return result[0]?.count || 0;
  }

  async getProjectRevenueLedgerEntry(id: number): Promise<ProjectRevenueLedger | undefined> {
    const [entry] = await db.select().from(projectRevenueLedger).where(eq(projectRevenueLedger.id, id));
    return entry;
  }

  async createProjectRevenueLedgerEntry(entry: InsertProjectRevenueLedger): Promise<ProjectRevenueLedger> {
    const [newEntry] = await db.insert(projectRevenueLedger).values(entry).returning();
    return newEntry;
  }

  async updateProjectRevenueLedgerEntry(id: number, updates: Partial<InsertProjectRevenueLedger>): Promise<ProjectRevenueLedger> {
    const [updated] = await db.update(projectRevenueLedger)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(projectRevenueLedger.id, id))
      .returning();
    return updated;
  }

  async deleteProjectRevenueLedgerEntry(id: number): Promise<void> {
    await db.delete(projectRevenueLedger).where(eq(projectRevenueLedger.id, id));
  }

  // Project financial snapshot operations
  async getProjectFinancialSnapshots(projectId: number, limit?: number, offset?: number): Promise<ProjectFinancialSnapshot[]> {
    let query = db.select().from(projectFinancialSnapshots)
      .where(eq(projectFinancialSnapshots.projectId, projectId))
      .orderBy(desc(projectFinancialSnapshots.snapshotDate));
    
    if (limit !== undefined) {
      query = query.limit(limit);
    }
    if (offset !== undefined) {
      query = query.offset(offset);
    }
    
    return await query;
  }

  async getProjectFinancialSnapshotsCount(projectId: number): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)::int` })
      .from(projectFinancialSnapshots)
      .where(eq(projectFinancialSnapshots.projectId, projectId));
    return result[0]?.count || 0;
  }

  async getLatestProjectFinancialSnapshot(projectId: number): Promise<ProjectFinancialSnapshot | undefined> {
    const [snapshot] = await db.select().from(projectFinancialSnapshots)
      .where(eq(projectFinancialSnapshots.projectId, projectId))
      .orderBy(desc(projectFinancialSnapshots.snapshotDate))
      .limit(1);
    return snapshot;
  }

  async createProjectFinancialSnapshot(snapshot: InsertProjectFinancialSnapshot): Promise<ProjectFinancialSnapshot> {
    const [newSnapshot] = await db.insert(projectFinancialSnapshots).values(snapshot).returning();
    return newSnapshot;
  }

  async deleteProjectFinancialSnapshot(id: number): Promise<void> {
    await db.delete(projectFinancialSnapshots).where(eq(projectFinancialSnapshots.id, id));
  }

  // ============================================
  // GOVERNMENT GRANTS (NONPROFIT) OPERATIONS
  // ============================================

  // Time/Effort Reporting operations
  async getTimeEffortReports(organizationId: number): Promise<TimeEffortReport[]> {
    return await db.select().from(timeEffortReports)
      .where(eq(timeEffortReports.organizationId, organizationId))
      .orderBy(desc(timeEffortReports.reportingPeriodEnd));
  }

  async getTimeEffortReport(id: number): Promise<TimeEffortReport | undefined> {
    const [report] = await db.select().from(timeEffortReports).where(eq(timeEffortReports.id, id));
    return report;
  }

  async createTimeEffortReport(report: InsertTimeEffortReport): Promise<TimeEffortReport> {
    const [newReport] = await db.insert(timeEffortReports).values(report).returning();
    return newReport;
  }

  async updateTimeEffortReport(id: number, updates: Partial<InsertTimeEffortReport>): Promise<TimeEffortReport> {
    const [updated] = await db.update(timeEffortReports)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(timeEffortReports.id, id))
      .returning();
    return updated;
  }

  async deleteTimeEffortReport(id: number): Promise<void> {
    await db.delete(timeEffortReports).where(eq(timeEffortReports.id, id));
  }

  // Cost Allowability Check operations
  async getCostAllowabilityChecks(organizationId: number): Promise<CostAllowabilityCheck[]> {
    return await db.select().from(costAllowabilityChecks)
      .where(eq(costAllowabilityChecks.organizationId, organizationId))
      .orderBy(desc(costAllowabilityChecks.createdAt));
  }

  async getCostAllowabilityCheck(id: number): Promise<CostAllowabilityCheck | undefined> {
    const [check] = await db.select().from(costAllowabilityChecks).where(eq(costAllowabilityChecks.id, id));
    return check;
  }

  async createCostAllowabilityCheck(check: InsertCostAllowabilityCheck): Promise<CostAllowabilityCheck> {
    const [newCheck] = await db.insert(costAllowabilityChecks).values(check).returning();
    return newCheck;
  }

  async updateCostAllowabilityCheck(id: number, updates: Partial<InsertCostAllowabilityCheck>): Promise<CostAllowabilityCheck> {
    const [updated] = await db.update(costAllowabilityChecks)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(costAllowabilityChecks.id, id))
      .returning();
    return updated;
  }

  async deleteCostAllowabilityCheck(id: number): Promise<void> {
    await db.delete(costAllowabilityChecks).where(eq(costAllowabilityChecks.id, id));
  }

  // Sub Award operations
  async getSubAwards(organizationId: number): Promise<SubAward[]> {
    const awardList = await db.select().from(subAwards)
      .where(eq(subAwards.organizationId, organizationId))
      .orderBy(desc(subAwards.awardDate));
    
    // Decrypt sensitive fields
    return awardList.map(a => ({
      ...a,
      subrecipientEIN: a.subrecipientEIN ? decryptField(a.subrecipientEIN) : null,
    }));
  }

  async getSubAward(id: number): Promise<SubAward | undefined> {
    const [award] = await db.select().from(subAwards).where(eq(subAwards.id, id));
    if (!award) return undefined;
    
    // Decrypt sensitive fields
    return {
      ...award,
      subrecipientEIN: award.subrecipientEIN ? decryptField(award.subrecipientEIN) : null,
    };
  }

  async createSubAward(award: InsertSubAward): Promise<SubAward> {
    const encryptedData = {
      ...award,
      subrecipientEIN: award.subrecipientEIN ? encryptField(award.subrecipientEIN) : null,
    };
    
    const [newAward] = await db.insert(subAwards).values(encryptedData).returning();
    
    // Decrypt before returning
    return {
      ...newAward,
      subrecipientEIN: newAward.subrecipientEIN ? decryptField(newAward.subrecipientEIN) : null,
    };
  }

  async updateSubAward(id: number, updates: Partial<InsertSubAward>): Promise<SubAward> {
    const encryptedUpdates = {
      ...updates,
      subrecipientEIN: updates.subrecipientEIN !== undefined ? 
        (updates.subrecipientEIN ? encryptField(updates.subrecipientEIN) : null) : undefined,
      updatedAt: new Date(),
    };
    
    const [updated] = await db.update(subAwards)
      .set(encryptedUpdates)
      .where(eq(subAwards.id, id))
      .returning();
    
    // Decrypt before returning
    return {
      ...updated,
      subrecipientEIN: updated.subrecipientEIN ? decryptField(updated.subrecipientEIN) : null,
    };
  }

  async deleteSubAward(id: number): Promise<void> {
    await db.delete(subAwards).where(eq(subAwards.id, id));
  }

  // Federal Financial Report operations
  async getFederalFinancialReports(organizationId: number): Promise<FederalFinancialReport[]> {
    return await db.select().from(federalFinancialReports)
      .where(eq(federalFinancialReports.organizationId, organizationId))
      .orderBy(desc(federalFinancialReports.reportingPeriodEnd));
  }

  async getFederalFinancialReport(id: number): Promise<FederalFinancialReport | undefined> {
    const [report] = await db.select().from(federalFinancialReports).where(eq(federalFinancialReports.id, id));
    return report;
  }

  async createFederalFinancialReport(report: InsertFederalFinancialReport): Promise<FederalFinancialReport> {
    const [newReport] = await db.insert(federalFinancialReports).values(report).returning();
    return newReport;
  }

  async updateFederalFinancialReport(id: number, updates: Partial<InsertFederalFinancialReport>): Promise<FederalFinancialReport> {
    const [updated] = await db.update(federalFinancialReports)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(federalFinancialReports.id, id))
      .returning();
    return updated;
  }

  async deleteFederalFinancialReport(id: number): Promise<void> {
    await db.delete(federalFinancialReports).where(eq(federalFinancialReports.id, id));
  }

  // Audit Prep Item operations
  async getAuditPrepItems(organizationId: number): Promise<AuditPrepItem[]> {
    return await db.select().from(auditPrepItems)
      .where(eq(auditPrepItems.organizationId, organizationId))
      .orderBy(desc(auditPrepItems.auditYear), desc(auditPrepItems.createdAt));
  }

  async getAuditPrepItem(id: number): Promise<AuditPrepItem | undefined> {
    const [item] = await db.select().from(auditPrepItems).where(eq(auditPrepItems.id, id));
    return item;
  }

  async createAuditPrepItem(item: InsertAuditPrepItem): Promise<AuditPrepItem> {
    const [newItem] = await db.insert(auditPrepItems).values(item).returning();
    return newItem;
  }

  async updateAuditPrepItem(id: number, updates: Partial<InsertAuditPrepItem>): Promise<AuditPrepItem> {
    const [updated] = await db.update(auditPrepItems)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(auditPrepItems.id, id))
      .returning();
    return updated;
  }

  async deleteAuditPrepItem(id: number): Promise<void> {
    await db.delete(auditPrepItems).where(eq(auditPrepItems.id, id));
  }

  // Notification operations
  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [newNotification] = await db.insert(notifications).values(notification).returning();
    return newNotification;
  }

  async getNotifications(userId: string, organizationId: number, filters?: { isRead?: boolean; limit?: number }): Promise<Notification[]> {
    let query = db.select().from(notifications)
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.organizationId, organizationId)
      ))
      .orderBy(desc(notifications.createdAt));

    // Apply isRead filter if specified
    if (filters?.isRead !== undefined) {
      query = db.select().from(notifications)
        .where(and(
          eq(notifications.userId, userId),
          eq(notifications.organizationId, organizationId),
          eq(notifications.isRead, filters.isRead ? 1 : 0)
        ))
        .orderBy(desc(notifications.createdAt));
    }

    // Apply limit if specified
    if (filters?.limit) {
      query = query.limit(filters.limit) as any;
    }

    return await query;
  }

  async getNotification(id: number): Promise<Notification | undefined> {
    const [notification] = await db.select().from(notifications).where(eq(notifications.id, id));
    return notification;
  }

  async markNotificationAsRead(id: number): Promise<void> {
    await db.update(notifications)
      .set({ isRead: 1 })
      .where(eq(notifications.id, id));
  }

  async markAllNotificationsAsRead(userId: string, organizationId: number): Promise<void> {
    await db.update(notifications)
      .set({ isRead: 1 })
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.organizationId, organizationId),
        eq(notifications.isRead, 0)
      ));
  }

  async getUnreadNotificationCount(userId: string, organizationId: number): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.organizationId, organizationId),
        eq(notifications.isRead, 0)
      ));
    return result[0]?.count || 0;
  }

  async deleteNotification(id: number): Promise<void> {
    await db.delete(notifications).where(eq(notifications.id, id));
  }

  // For-profit: Proposal/Bid Management operations
  async getProposals(organizationId: number): Promise<Proposal[]> {
    return await db.select().from(proposals)
      .where(eq(proposals.organizationId, organizationId))
      .orderBy(desc(proposals.createdAt));
  }

  async getProposal(id: number): Promise<Proposal | undefined> {
    const [proposal] = await db.select().from(proposals).where(eq(proposals.id, id));
    return proposal;
  }

  async createProposal(proposal: InsertProposal): Promise<Proposal> {
    const [newProposal] = await db.insert(proposals).values(proposal).returning();
    return newProposal;
  }

  async updateProposal(id: number, updates: Partial<InsertProposal>): Promise<Proposal> {
    const [updated] = await db.update(proposals)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(proposals.id, id))
      .returning();
    return updated;
  }

  async deleteProposal(id: number): Promise<void> {
    await db.delete(proposals).where(eq(proposals.id, id));
  }

  // For-profit: Subcontractor Management operations
  async getSubcontractors(organizationId: number): Promise<Subcontractor[]> {
    return await db.select().from(subcontractors)
      .where(eq(subcontractors.organizationId, organizationId))
      .orderBy(desc(subcontractors.createdAt));
  }

  async getSubcontractor(id: number): Promise<Subcontractor | undefined> {
    const [subcontractor] = await db.select().from(subcontractors).where(eq(subcontractors.id, id));
    return subcontractor;
  }

  async createSubcontractor(subcontractor: InsertSubcontractor): Promise<Subcontractor> {
    const [newSubcontractor] = await db.insert(subcontractors).values(subcontractor).returning();
    return newSubcontractor;
  }

  async updateSubcontractor(id: number, updates: Partial<InsertSubcontractor>): Promise<Subcontractor> {
    const [updated] = await db.update(subcontractors)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(subcontractors.id, id))
      .returning();
    return updated;
  }

  async deleteSubcontractor(id: number): Promise<void> {
    await db.delete(subcontractors).where(eq(subcontractors.id, id));
  }

  // For-profit: Change Order Management operations
  async getChangeOrders(organizationId: number): Promise<ChangeOrder[]> {
    return await db.select().from(changeOrders)
      .where(eq(changeOrders.organizationId, organizationId))
      .orderBy(desc(changeOrders.createdAt));
  }

  async getChangeOrder(id: number): Promise<ChangeOrder | undefined> {
    const [changeOrder] = await db.select().from(changeOrders).where(eq(changeOrders.id, id));
    return changeOrder;
  }

  async getChangeOrdersByContract(contractId: number, organizationId: number): Promise<ChangeOrder[]> {
    return await db.select().from(changeOrders)
      .where(and(eq(changeOrders.contractId, contractId), eq(changeOrders.organizationId, organizationId)))
      .orderBy(desc(changeOrders.createdAt));
  }

  async createChangeOrder(changeOrder: InsertChangeOrder): Promise<ChangeOrder> {
    const [newChangeOrder] = await db.insert(changeOrders).values(changeOrder).returning();
    return newChangeOrder;
  }

  async updateChangeOrder(id: number, updates: Partial<InsertChangeOrder>): Promise<ChangeOrder> {
    const [updated] = await db.update(changeOrders)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(changeOrders.id, id))
      .returning();
    return updated;
  }

  async deleteChangeOrder(id: number): Promise<void> {
    await db.delete(changeOrders).where(eq(changeOrders.id, id));
  }

  // Form/Survey operations
  async getForms(organizationId: number, formType?: 'survey' | 'form'): Promise<Form[]> {
    if (formType) {
      return await db.select().from(forms)
        .where(and(eq(forms.organizationId, organizationId), eq(forms.formType, formType)))
        .orderBy(desc(forms.createdAt));
    }
    return await db.select().from(forms)
      .where(eq(forms.organizationId, organizationId))
      .orderBy(desc(forms.createdAt));
  }

  async getForm(id: number): Promise<Form | undefined> {
    const [form] = await db.select().from(forms).where(eq(forms.id, id));
    return form;
  }

  async getFormByPublicId(publicId: string): Promise<Form | undefined> {
    const [form] = await db.select().from(forms).where(eq(forms.publicId, publicId));
    return form;
  }

  async createForm(form: InsertForm): Promise<Form> {
    const [newForm] = await db.insert(forms).values(form).returning();
    return newForm;
  }

  async updateForm(id: number, updates: Partial<InsertForm>): Promise<Form> {
    const [updated] = await db.update(forms)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(forms.id, id))
      .returning();
    return updated;
  }

  async deleteForm(id: number): Promise<void> {
    await db.delete(forms).where(eq(forms.id, id));
  }

  async incrementFormResponseCount(id: number): Promise<void> {
    await db.update(forms)
      .set({ responseCount: sql`${forms.responseCount} + 1` })
      .where(eq(forms.id, id));
  }

  // Form Question operations
  async getFormQuestions(formId: number): Promise<FormQuestion[]> {
    return await db.select().from(formQuestions)
      .where(eq(formQuestions.formId, formId))
      .orderBy(formQuestions.orderIndex);
  }

  async createFormQuestion(question: InsertFormQuestion): Promise<FormQuestion> {
    const [newQuestion] = await db.insert(formQuestions).values(question).returning();
    return newQuestion;
  }

  async updateFormQuestion(id: number, updates: Partial<InsertFormQuestion>): Promise<FormQuestion> {
    const [updated] = await db.update(formQuestions)
      .set(updates)
      .where(eq(formQuestions.id, id))
      .returning();
    return updated;
  }

  async deleteFormQuestion(id: number): Promise<void> {
    await db.delete(formQuestions).where(eq(formQuestions.id, id));
  }

  async reorderFormQuestions(formId: number, questionIds: number[]): Promise<void> {
    for (let i = 0; i < questionIds.length; i++) {
      await db.update(formQuestions)
        .set({ orderIndex: i })
        .where(and(eq(formQuestions.id, questionIds[i]), eq(formQuestions.formId, formId)));
    }
  }

  // Form Response operations
  async getFormResponses(formId: number): Promise<FormResponse[]> {
    return await db.select().from(formResponses)
      .where(eq(formResponses.formId, formId))
      .orderBy(desc(formResponses.submittedAt));
  }

  async getFormResponse(id: number): Promise<FormResponse | undefined> {
    const [response] = await db.select().from(formResponses).where(eq(formResponses.id, id));
    return response;
  }

  async createFormResponse(response: InsertFormResponse): Promise<FormResponse> {
    const [newResponse] = await db.insert(formResponses).values(response).returning();
    return newResponse;
  }

  async deleteFormResponse(id: number): Promise<void> {
    await db.delete(formResponses).where(eq(formResponses.id, id));
  }
}

export const storage = new DatabaseStorage();
