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
  customReports,
  type CustomReport,
  type InsertCustomReport,
  auditLogs,
  type AuditLog,
  type InsertAuditLog,
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
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, sql, desc, inArray } from "drizzle-orm";
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

  // Donor operations
  getDonors(organizationId: number): Promise<Donor[]>;
  getDonor(id: number): Promise<Donor | undefined>;
  createDonor(donor: InsertDonor): Promise<Donor>;
  updateDonor(id: number, updates: Partial<InsertDonor>): Promise<Donor>;
  deleteDonor(id: number): Promise<void>;
  getDonorDonations(donorId: number, year?: number): Promise<Array<Transaction & { donorName: string }>>;
  getDonationsByYear(organizationId: number, year: number): Promise<Array<{ donor: Donor; totalAmount: string; donations: Transaction[] }>>;

  // Transaction operations
  getTransaction(id: number): Promise<Transaction | undefined>;
  getTransactions(organizationId: number): Promise<Transaction[]>;
  getTransactionsByDateRange(organizationId: number, startDate: Date, endDate: Date): Promise<Transaction[]>;
  getRecentTransactions(organizationId: number, limit: number): Promise<Transaction[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  updateTransaction(id: number, updates: Partial<InsertTransaction>): Promise<Transaction>;
  deleteTransaction(id: number): Promise<void>;

  // Reconciliation operations
  getUnreconciledTransactions(organizationId: number, plaidAccountId?: string): Promise<Transaction[]>;
  reconcileTransaction(id: number, userId: string): Promise<Transaction>;
  unreconcileTransaction(id: number): Promise<Transaction>;
  bulkReconcileTransactions(ids: number[], userId: string): Promise<number>;
  autoReconcileTransactions(organizationId: number): Promise<{ reconciledCount: number; matchedTransactions: Array<{ transactionId: number; plaidTransactionId: string }> }>;

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

  // Nonprofit-specific: Program operations
  getPrograms(organizationId: number): Promise<Program[]>;
  getProgram(id: number): Promise<Program | undefined>;
  createProgram(program: InsertProgram): Promise<Program>;
  updateProgram(id: number, updates: Partial<InsertProgram>): Promise<Program>;
  deleteProgram(id: number): Promise<void>;
  getProgramExpenses(programId: number, startDate?: Date, endDate?: Date): Promise<Array<Transaction & { totalAmount: string }>>;

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
  createContract(contract: InsertContract): Promise<Contract>;
  updateContract(id: number, updates: Partial<InsertContract>): Promise<Contract>;
  deleteContract(id: number): Promise<void>;
  updateContractBilledAmount(id: number, amount: string): Promise<Contract>;

  // For-profit: Contract milestone operations
  getContractMilestones(contractId: number): Promise<ContractMilestone[]>;
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

  // Donor operations
  async getDonors(organizationId: number): Promise<Donor[]> {
    return await db
      .select()
      .from(donors)
      .where(eq(donors.organizationId, organizationId))
      .orderBy(donors.name);
  }

  async getDonor(id: number): Promise<Donor | undefined> {
    const [donor] = await db
      .select()
      .from(donors)
      .where(eq(donors.id, id));
    return donor;
  }

  async createDonor(donor: InsertDonor): Promise<Donor> {
    const [newDonor] = await db
      .insert(donors)
      .values(donor)
      .returning();
    return newDonor;
  }

  async updateDonor(id: number, updates: Partial<InsertDonor>): Promise<Donor> {
    const [donor] = await db
      .update(donors)
      .set(updates)
      .where(eq(donors.id, id))
      .returning();
    return donor;
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

  async autoReconcileTransactions(organizationId: number): Promise<{ reconciledCount: number; matchedTransactions: Array<{ transactionId: number; plaidTransactionId: string }> }> {
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
          reconciledBy: 'auto-reconcile',
        })
        .where(inArray(transactions.id, idsToReconcile));
    }

    return {
      reconciledCount: idsToReconcile.length,
      matchedTransactions,
    };
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
        if (filters?.categoryId) {
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
    const [newLog] = await db
      .insert(auditLogs)
      .values(log)
      .returning();
    return newLog;
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

  // Employee operations
  async getEmployees(organizationId: number): Promise<Employee[]> {
    return await db.select().from(employees).where(eq(employees.organizationId, organizationId)).orderBy(desc(employees.createdAt));
  }

  async getEmployee(id: number): Promise<Employee | undefined> {
    const [employee] = await db.select().from(employees).where(eq(employees.id, id));
    return employee;
  }

  async getActiveEmployees(organizationId: number): Promise<Employee[]> {
    return await db.select().from(employees).where(
      and(eq(employees.organizationId, organizationId), eq(employees.isActive, 1))
    ).orderBy(employees.lastName, employees.firstName);
  }

  async createEmployee(employee: InsertEmployee): Promise<Employee> {
    const [newEmployee] = await db.insert(employees).values(employee).returning();
    return newEmployee;
  }

  async updateEmployee(id: number, updates: Partial<InsertEmployee>): Promise<Employee> {
    const [updated] = await db.update(employees)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(employees.id, id))
      .returning();
    return updated;
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
    await db.delete(contracts).where(eq(contracts.id, id));
  }

  async updateContractBilledAmount(id: number, amount: string): Promise<Contract> {
    const [updated] = await db.update(contracts)
      .set({ billedAmount: amount, updatedAt: new Date() })
      .where(eq(contracts.id, id))
      .returning();
    return updated;
  }

  // Contract milestone operations
  async getContractMilestones(contractId: number): Promise<ContractMilestone[]> {
    return await db.select().from(contractMilestones)
      .where(eq(contractMilestones.contractId, contractId))
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
}

export const storage = new DatabaseStorage();
