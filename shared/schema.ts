// Referenced from javascript_log_in_with_replit and javascript_database blueprints
import { sql, relations } from 'drizzle-orm';
import {
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  varchar,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ============================================
// ENUMS
// ============================================

export const organizationTypeEnum = pgEnum('organization_type', ['nonprofit', 'forprofit']);
export const userRoleEnum = pgEnum('user_role', ['owner', 'admin', 'accountant', 'viewer']);
export const permissionLevelEnum = pgEnum('permission_level', [
  'view_only',           // Can only view data
  'make_reports',        // Can view and generate reports
  'edit_transactions',   // Can view and edit transactions only
  'view_make_reports',   // Can view and make reports only
  'full_access'          // Can view, edit transactions, and make reports
]);
export const invitationStatusEnum = pgEnum('invitation_status', ['pending', 'accepted', 'expired', 'cancelled', 'declined']);
export const transactionTypeEnum = pgEnum('transaction_type', ['income', 'expense']);
export const accountTypeEnum = pgEnum('account_type', ['income', 'expense', 'asset', 'liability', 'equity']);
export const grantStatusEnum = pgEnum('grant_status', ['active', 'completed', 'pending']);
export const aiDecisionEnum = pgEnum('ai_decision', ['pending', 'accepted', 'rejected', 'modified']);
export const budgetPeriodEnum = pgEnum('budget_period', ['monthly', 'quarterly', 'yearly']);
export const recurringFrequencyEnum = pgEnum('recurring_frequency', ['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly']);
export const invoiceStatusEnum = pgEnum('invoice_status', ['draft', 'sent', 'paid', 'partial', 'overdue', 'cancelled']);
export const billStatusEnum = pgEnum('bill_status', ['received', 'scheduled', 'paid', 'partial', 'overdue', 'cancelled']);
export const approvalStatusEnum = pgEnum('approval_status', ['pending', 'approved', 'rejected', 'cancelled']);
export const taxFormTypeEnum = pgEnum('tax_form_type', ['1099_nec', '1099_misc', '1099_int', 'w2', '990', '1040_schedule_c']);
export const cashFlowScenarioTypeEnum = pgEnum('cash_flow_scenario_type', ['optimistic', 'realistic', 'pessimistic', 'custom']);
export const auditActionEnum = pgEnum('audit_action', ['create', 'update', 'delete']);
export const reconciliationStatusEnum = pgEnum('reconciliation_status', ['unreconciled', 'reconciled', 'pending']);
export const employmentTypeEnum = pgEnum('employment_type', ['full_time', 'part_time', 'contractor']);
export const payTypeEnum = pgEnum('pay_type', ['salary', 'hourly']);
export const payScheduleEnum = pgEnum('pay_schedule', ['weekly', 'biweekly', 'semimonthly', 'monthly']);
export const payrollStatusEnum = pgEnum('payroll_status', ['draft', 'processed', 'paid']);
export const deductionTypeEnum = pgEnum('deduction_type', ['tax', 'insurance', 'retirement', 'garnishment', 'other']);
export const deductionCalculationTypeEnum = pgEnum('deduction_calculation_type', ['percentage', 'fixed_amount']);

// Nonprofit-specific enums
export const fundTypeEnum = pgEnum('fund_type', ['restricted', 'unrestricted']);
export const pledgeStatusEnum = pgEnum('pledge_status', ['pending', 'partial', 'fulfilled', 'cancelled', 'overdue']);
export const functionalCategoryEnum = pgEnum('functional_category', ['program', 'administrative', 'fundraising']);
export const complianceStatusEnum = pgEnum('compliance_status', ['compliant', 'at_risk', 'non_compliant', 'pending_review']);
export const programStatusEnum = pgEnum('program_status', ['active', 'completed', 'on_hold', 'planned']);

// For-profit Government Contracts enums
export const contractStatusEnum = pgEnum('contract_status', ['active', 'completed', 'pending', 'on_hold', 'cancelled']);
export const milestoneStatusEnum = pgEnum('milestone_status', ['pending', 'in_progress', 'completed', 'overdue']);
export const timeEntryStatusEnum = pgEnum('time_entry_status', ['draft', 'submitted', 'approved', 'billed']);
export const costTypeEnum = pgEnum('cost_type', ['direct_labor', 'direct_materials', 'direct_other', 'indirect', 'overhead']);

// ============================================
// SESSION & USER TABLES (Required for Replit Auth)
// ============================================

// Session storage table - mandatory for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table - mandatory for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// ============================================
// ORGANIZATIONS
// ============================================

export const organizations = pgTable("organizations", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 255 }).notNull(),
  type: organizationTypeEnum("type").notNull(),
  description: text("description"),
  logoUrl: varchar("logo_url"),
  companyName: varchar("company_name", { length: 255 }),
  companyAddress: text("company_address"),
  companyPhone: varchar("company_phone", { length: 50 }),
  companyEmail: varchar("company_email", { length: 255 }),
  companyWebsite: varchar("company_website", { length: 255 }),
  taxId: varchar("tax_id", { length: 100 }),
  invoicePrefix: varchar("invoice_prefix", { length: 20 }),
  invoiceNotes: text("invoice_notes"),
  invoicePrimaryColor: varchar("invoice_primary_color", { length: 7 }).default('#3b82f6'),
  invoiceAccentColor: varchar("invoice_accent_color", { length: 7 }).default('#1e40af'),
  invoiceFontFamily: varchar("invoice_font_family", { length: 50 }).default('Inter'),
  invoiceTemplate: varchar("invoice_template", { length: 20 }).default('classic'),
  invoicePaymentTerms: text("invoice_payment_terms"),
  invoicePaymentMethods: text("invoice_payment_methods"),
  invoiceFooter: text("invoice_footer"),
  invoiceCustomFields: jsonb("invoice_custom_fields"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertOrganizationSchema = createInsertSchema(organizations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type Organization = typeof organizations.$inferSelect;

// ============================================
// USER ORGANIZATION ROLES
// ============================================

export const userOrganizationRoles = pgTable("user_organization_roles", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  role: userRoleEnum("role").notNull(),
  permissions: permissionLevelEnum("permissions"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserOrganizationRoleSchema = createInsertSchema(userOrganizationRoles).omit({
  id: true,
  createdAt: true,
});

export type InsertUserOrganizationRole = z.infer<typeof insertUserOrganizationRoleSchema>;
export type UserOrganizationRole = typeof userOrganizationRoles.$inferSelect;

// ============================================
// INVITATIONS
// ============================================

export const invitations = pgTable("invitations", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  email: varchar("email", { length: 255 }).notNull(),
  invitedBy: varchar("invited_by").notNull().references(() => users.id),
  role: userRoleEnum("role").notNull(),
  permissions: permissionLevelEnum("permissions").notNull(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  status: invitationStatusEnum("status").notNull().default('pending'),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  acceptedAt: timestamp("accepted_at"),
});

export const insertInvitationSchema = createInsertSchema(invitations).omit({
  id: true,
  createdAt: true,
  acceptedAt: true,
}).extend({
  expiresAt: z.coerce.date(),
});

export type InsertInvitation = z.infer<typeof insertInvitationSchema>;
export type Invitation = typeof invitations.$inferSelect;

// ============================================
// CHART OF ACCOUNTS / CATEGORIES
// ============================================

export const categories = pgTable("categories", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: varchar("name", { length: 255 }).notNull(),
  type: accountTypeEnum("type").notNull(),
  description: text("description"),
  parentCategoryId: integer("parent_category_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;

// ============================================
// VENDORS (Suppliers/Service Providers)
// ============================================

export const vendors = pgTable("vendors", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: varchar("name", { length: 255 }).notNull(),
  contactName: varchar("contact_name", { length: 255 }),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  address: text("address"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertVendorSchema = createInsertSchema(vendors).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertVendor = z.infer<typeof insertVendorSchema>;
export type Vendor = typeof vendors.$inferSelect;

// ============================================
// CLIENTS (Customers)
// ============================================

export const clients = pgTable("clients", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: varchar("name", { length: 255 }).notNull(),
  contactName: varchar("contact_name", { length: 255 }),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  address: text("address"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;

// ============================================
// DONORS (For Non-Profits)
// ============================================

export const donors = pgTable("donors", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  address: text("address"),
  taxId: varchar("tax_id", { length: 100 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertDonorSchema = createInsertSchema(donors).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertDonor = z.infer<typeof insertDonorSchema>;
export type Donor = typeof donors.$inferSelect;

// ============================================
// INVOICES (Sent to Clients)
// ============================================

export const invoices = pgTable("invoices", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  clientId: integer("client_id").references(() => clients.id, { onDelete: 'set null' }),
  invoiceNumber: varchar("invoice_number", { length: 100 }).notNull(),
  issueDate: timestamp("issue_date").notNull(),
  dueDate: timestamp("due_date").notNull(),
  status: invoiceStatusEnum("status").notNull().default('draft'),
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull(),
  taxAmount: numeric("tax_amount", { precision: 12, scale: 2 }),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull(),
  notes: text("notes"),
  transactionId: integer("transaction_id").references(() => transactions.id, { onDelete: 'set null' }),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  createdBy: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  issueDate: z.coerce.date(),
  dueDate: z.coerce.date(),
  subtotal: z.string().or(z.number()).transform(val => String(val)),
  taxAmount: z.string().or(z.number()).transform(val => String(val)).optional().nullable(),
  totalAmount: z.string().or(z.number()).transform(val => String(val)),
});

export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoices.$inferSelect;

// ============================================
// INVOICE LINE ITEMS
// ============================================

export const invoiceLineItems = pgTable("invoice_line_items", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  invoiceId: integer("invoice_id").notNull().references(() => invoices.id, { onDelete: 'cascade' }),
  description: text("description").notNull(),
  quantity: numeric("quantity", { precision: 12, scale: 2 }).notNull(),
  rate: numeric("rate", { precision: 12, scale: 2 }).notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertInvoiceLineItemSchema = createInsertSchema(invoiceLineItems).omit({
  id: true,
  invoiceId: true,
  createdAt: true,
}).extend({
  quantity: z.string().or(z.number()).transform(val => String(val)),
  rate: z.string().or(z.number()).transform(val => String(val)),
  amount: z.string().or(z.number()).transform(val => String(val)),
});

export type InsertInvoiceLineItem = z.infer<typeof insertInvoiceLineItemSchema>;
export type InvoiceLineItem = typeof invoiceLineItems.$inferSelect;

// ============================================
// BILLS (Received from Vendors)
// ============================================

export const bills = pgTable("bills", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  vendorId: integer("vendor_id").references(() => vendors.id, { onDelete: 'set null' }),
  billNumber: varchar("bill_number", { length: 100 }).notNull(),
  issueDate: timestamp("issue_date").notNull(),
  dueDate: timestamp("due_date").notNull(),
  status: billStatusEnum("status").notNull().default('received'),
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull(),
  taxAmount: numeric("tax_amount", { precision: 12, scale: 2 }),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull(),
  notes: text("notes"),
  transactionId: integer("transaction_id").references(() => transactions.id, { onDelete: 'set null' }),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertBillSchema = createInsertSchema(bills).omit({
  id: true,
  createdBy: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  issueDate: z.coerce.date(),
  dueDate: z.coerce.date(),
  subtotal: z.string().or(z.number()).transform(val => String(val)),
  taxAmount: z.string().or(z.number()).transform(val => String(val)).optional().nullable(),
  totalAmount: z.string().or(z.number()).transform(val => String(val)),
});

export type InsertBill = z.infer<typeof insertBillSchema>;
export type Bill = typeof bills.$inferSelect;

// ============================================
// BILL LINE ITEMS
// ============================================

export const billLineItems = pgTable("bill_line_items", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  billId: integer("bill_id").notNull().references(() => bills.id, { onDelete: 'cascade' }),
  description: text("description").notNull(),
  quantity: numeric("quantity", { precision: 12, scale: 2 }).notNull(),
  rate: numeric("rate", { precision: 12, scale: 2 }).notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertBillLineItemSchema = createInsertSchema(billLineItems).omit({
  id: true,
  billId: true,
  createdAt: true,
}).extend({
  quantity: z.string().or(z.number()).transform(val => String(val)),
  rate: z.string().or(z.number()).transform(val => String(val)),
  amount: z.string().or(z.number()).transform(val => String(val)),
});

export type InsertBillLineItem = z.infer<typeof insertBillLineItemSchema>;
export type BillLineItem = typeof billLineItems.$inferSelect;

// ============================================
// TRANSACTIONS
// ============================================

export const transactions = pgTable("transactions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  date: timestamp("date").notNull(),
  description: text("description").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  type: transactionTypeEnum("type").notNull(),
  categoryId: integer("category_id").references(() => categories.id, { onDelete: 'set null' }),
  grantId: integer("grant_id").references(() => grants.id, { onDelete: 'set null' }),
  vendorId: integer("vendor_id").references(() => vendors.id, { onDelete: 'set null' }),
  clientId: integer("client_id").references(() => clients.id, { onDelete: 'set null' }),
  donorId: integer("donor_id").references(() => donors.id, { onDelete: 'set null' }),
  // Nonprofit-specific fields
  fundId: integer("fund_id").references(() => funds.id, { onDelete: 'set null' }),
  programId: integer("program_id").references(() => programs.id, { onDelete: 'set null' }),
  functionalCategory: functionalCategoryEnum("functional_category"),
  reconciliationStatus: reconciliationStatusEnum("reconciliation_status").notNull().default('unreconciled'),
  reconciledDate: timestamp("reconciled_date"),
  reconciledBy: varchar("reconciled_by").references(() => users.id),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  date: z.coerce.date(),
  amount: z.string().or(z.number()).transform(val => String(val)),
});

export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;

// ============================================
// TRANSACTION ATTACHMENTS (Receipts & Documents)
// ============================================

export const transactionAttachments = pgTable("transaction_attachments", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  transactionId: integer("transaction_id").notNull().references(() => transactions.id, { onDelete: 'cascade' }),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileSize: integer("file_size").notNull(),
  fileType: varchar("file_type", { length: 100 }).notNull(),
  objectPath: text("object_path").notNull(),
  uploadedBy: varchar("uploaded_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTransactionAttachmentSchema = createInsertSchema(transactionAttachments).omit({
  id: true,
  createdAt: true,
});

export type InsertTransactionAttachment = z.infer<typeof insertTransactionAttachmentSchema>;
export type TransactionAttachment = typeof transactionAttachments.$inferSelect;

// ============================================
// GRANTS (For Non-Profits)
// ============================================

export const grants = pgTable("grants", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: varchar("name", { length: 255 }).notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  restrictions: text("restrictions"),
  status: grantStatusEnum("status").notNull().default('active'),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  // Grant lifecycle fields
  reportingRequirements: text("reporting_requirements"), // What reports are required
  reportingFrequency: varchar("reporting_frequency", { length: 50 }), // Monthly, Quarterly, etc.
  nextReportDueDate: timestamp("next_report_due_date"),
  lastReportSubmittedDate: timestamp("last_report_submitted_date"),
  complianceStatus: complianceStatusEnum("compliance_status").default('compliant'),
  complianceNotes: text("compliance_notes"), // Any compliance concerns
  grantorContact: varchar("grantor_contact", { length: 255 }), // Primary contact at funding org
  grantorEmail: varchar("grantor_email", { length: 255 }),
  grantorPhone: varchar("grantor_phone", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertGrantSchema = createInsertSchema(grants).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  amount: z.string().or(z.number()).transform(val => String(val)),
  startDate: z.coerce.date().optional().nullable(),
  endDate: z.coerce.date().optional().nullable(),
  nextReportDueDate: z.coerce.date().optional().nullable(),
  lastReportSubmittedDate: z.coerce.date().optional().nullable(),
});

export type InsertGrant = z.infer<typeof insertGrantSchema>;
export type Grant = typeof grants.$inferSelect;

// ============================================
// BUDGETS
// ============================================

export const budgets = pgTable("budgets", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: varchar("name", { length: 255 }).notNull(),
  period: budgetPeriodEnum("period").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertBudgetSchema = createInsertSchema(budgets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
});

export type InsertBudget = z.infer<typeof insertBudgetSchema>;
export type Budget = typeof budgets.$inferSelect;

export const budgetItems = pgTable("budget_items", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  budgetId: integer("budget_id").notNull().references(() => budgets.id, { onDelete: 'cascade' }),
  categoryId: integer("category_id").notNull().references(() => categories.id, { onDelete: 'cascade' }),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertBudgetItemSchema = createInsertSchema(budgetItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  amount: z.string().or(z.number()).transform(val => String(val)),
});

export type InsertBudgetItem = z.infer<typeof insertBudgetItemSchema>;
export type BudgetItem = typeof budgetItems.$inferSelect;

// ============================================
// PLAID INTEGRATIONS
// ============================================

export const plaidItems = pgTable("plaid_items", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  itemId: varchar("item_id", { length: 255 }).notNull().unique(),
  accessToken: text("access_token").notNull(),
  institutionId: varchar("institution_id", { length: 255 }),
  institutionName: varchar("institution_name", { length: 255 }),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPlaidItemSchema = createInsertSchema(plaidItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPlaidItem = z.infer<typeof insertPlaidItemSchema>;
export type PlaidItem = typeof plaidItems.$inferSelect;

export const plaidAccounts = pgTable("plaid_accounts", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  plaidItemId: integer("plaid_item_id").notNull().references(() => plaidItems.id, { onDelete: 'cascade' }),
  accountId: varchar("account_id", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  officialName: varchar("official_name", { length: 255 }),
  mask: varchar("mask", { length: 10 }),
  type: varchar("type", { length: 50 }),
  subtype: varchar("subtype", { length: 50 }),
  currentBalance: numeric("current_balance", { precision: 12, scale: 2 }),
  availableBalance: numeric("available_balance", { precision: 12, scale: 2 }),
  isoCurrencyCode: varchar("iso_currency_code", { length: 3 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPlaidAccountSchema = createInsertSchema(plaidAccounts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPlaidAccount = z.infer<typeof insertPlaidAccountSchema>;
export type PlaidAccount = typeof plaidAccounts.$inferSelect;

// ============================================
// AI CATEGORIZATION HISTORY
// ============================================

export const categorizationHistory = pgTable("categorization_history", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  transactionId: integer("transaction_id").references(() => transactions.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id),
  transactionDescription: text("transaction_description").notNull(),
  transactionAmount: numeric("transaction_amount", { precision: 12, scale: 2 }).notNull(),
  transactionType: transactionTypeEnum("transaction_type").notNull(),
  suggestedCategoryId: integer("suggested_category_id").notNull().references(() => categories.id, { onDelete: 'cascade' }),
  suggestedCategoryName: varchar("suggested_category_name", { length: 255 }).notNull(),
  confidence: integer("confidence").notNull(),
  reasoning: text("reasoning"),
  userDecision: aiDecisionEnum("user_decision").notNull(),
  finalCategoryId: integer("final_category_id").references(() => categories.id, { onDelete: 'set null' }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCategorizationHistorySchema = createInsertSchema(categorizationHistory).omit({
  id: true,
  createdAt: true,
});

export type InsertCategorizationHistory = z.infer<typeof insertCategorizationHistorySchema>;
export type CategorizationHistory = typeof categorizationHistory.$inferSelect;

// ============================================
// RECURRING TRANSACTIONS
// ============================================

export const recurringTransactions = pgTable("recurring_transactions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  description: text("description").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  type: transactionTypeEnum("type").notNull(),
  categoryId: integer("category_id").references(() => categories.id, { onDelete: 'set null' }),
  frequency: recurringFrequencyEnum("frequency").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  lastGeneratedDate: timestamp("last_generated_date"),
  dayOfMonth: integer("day_of_month"),
  isActive: integer("is_active").notNull().default(1),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertRecurringTransactionSchema = createInsertSchema(recurringTransactions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastGeneratedDate: true,
}).extend({
  amount: z.string().or(z.number()).transform(val => String(val)),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional().nullable(),
  dayOfMonth: z.number().min(1).max(31).optional().nullable(),
  isActive: z.number().default(1),
});

export type InsertRecurringTransaction = z.infer<typeof insertRecurringTransactionSchema>;
export type RecurringTransaction = typeof recurringTransactions.$inferSelect;

// ============================================
// EXPENSE APPROVALS
// ============================================

export const expenseApprovals = pgTable("expense_approvals", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  description: text("description").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  categoryId: integer("category_id").references(() => categories.id, { onDelete: 'set null' }),
  vendorId: integer("vendor_id").references(() => vendors.id, { onDelete: 'set null' }),
  requestDate: timestamp("request_date").notNull().defaultNow(),
  requestedBy: varchar("requested_by").notNull().references(() => users.id),
  status: approvalStatusEnum("status").notNull().default('pending'),
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
  receiptUrl: varchar("receipt_url"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertExpenseApprovalSchema = createInsertSchema(expenseApprovals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  requestDate: true,
  reviewedAt: true,
}).extend({
  amount: z.string().or(z.number()).transform(val => String(val)),
  status: z.enum(['pending', 'approved', 'rejected', 'cancelled']).default('pending'),
});

export type InsertExpenseApproval = z.infer<typeof insertExpenseApprovalSchema>;
export type ExpenseApproval = typeof expenseApprovals.$inferSelect;

// ============================================
// CASH FLOW FORECASTING
// ============================================

export const cashFlowScenarios = pgTable("cash_flow_scenarios", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: varchar("name", { length: 255 }).notNull(),
  type: cashFlowScenarioTypeEnum("type").notNull(),
  description: text("description"),
  incomeGrowthRate: numeric("income_growth_rate", { precision: 5, scale: 2 }).default('0'),
  expenseGrowthRate: numeric("expense_growth_rate", { precision: 5, scale: 2 }).default('0'),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCashFlowScenarioSchema = createInsertSchema(cashFlowScenarios).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  incomeGrowthRate: z.string().or(z.number()).transform(val => String(val)),
  expenseGrowthRate: z.string().or(z.number()).transform(val => String(val)),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
});

export type InsertCashFlowScenario = z.infer<typeof insertCashFlowScenarioSchema>;
export type CashFlowScenario = typeof cashFlowScenarios.$inferSelect;

export const cashFlowProjections = pgTable("cash_flow_projections", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  scenarioId: integer("scenario_id").notNull().references(() => cashFlowScenarios.id, { onDelete: 'cascade' }),
  month: timestamp("month").notNull(),
  projectedIncome: numeric("projected_income", { precision: 12, scale: 2 }).notNull(),
  projectedExpenses: numeric("projected_expenses", { precision: 12, scale: 2 }).notNull(),
  projectedBalance: numeric("projected_balance", { precision: 12, scale: 2 }).notNull(),
  actualIncome: numeric("actual_income", { precision: 12, scale: 2 }),
  actualExpenses: numeric("actual_expenses", { precision: 12, scale: 2 }),
  actualBalance: numeric("actual_balance", { precision: 12, scale: 2 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCashFlowProjectionSchema = createInsertSchema(cashFlowProjections).omit({
  id: true,
  createdAt: true,
}).extend({
  month: z.coerce.date(),
  projectedIncome: z.string().or(z.number()).transform(val => String(val)),
  projectedExpenses: z.string().or(z.number()).transform(val => String(val)),
  projectedBalance: z.string().or(z.number()).transform(val => String(val)),
  actualIncome: z.string().or(z.number()).transform(val => String(val)).optional().nullable(),
  actualExpenses: z.string().or(z.number()).transform(val => String(val)).optional().nullable(),
  actualBalance: z.string().or(z.number()).transform(val => String(val)).optional().nullable(),
});

export type InsertCashFlowProjection = z.infer<typeof insertCashFlowProjectionSchema>;
export type CashFlowProjection = typeof cashFlowProjections.$inferSelect;

// ============================================
// TAX REPORTING
// ============================================

export const taxCategories = pgTable("tax_categories", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  taxFormType: taxFormTypeEnum("tax_form_type"),
  isDeductible: integer("is_deductible").notNull().default(1),
  formLine: varchar("form_line", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertTaxCategorySchema = createInsertSchema(taxCategories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  isDeductible: z.number().default(1),
});

export type InsertTaxCategory = z.infer<typeof insertTaxCategorySchema>;
export type TaxCategory = typeof taxCategories.$inferSelect;

export const taxReports = pgTable("tax_reports", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  taxYear: integer("tax_year").notNull(),
  formType: taxFormTypeEnum("form_type").notNull(),
  totalIncome: numeric("total_income", { precision: 12, scale: 2 }).notNull().default('0'),
  totalExpenses: numeric("total_expenses", { precision: 12, scale: 2 }).notNull().default('0'),
  totalDeductions: numeric("total_deductions", { precision: 12, scale: 2 }).notNull().default('0'),
  netIncome: numeric("net_income", { precision: 12, scale: 2 }).notNull().default('0'),
  reportData: jsonb("report_data"),
  notes: text("notes"),
  generatedBy: varchar("generated_by").notNull().references(() => users.id),
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTaxReportSchema = createInsertSchema(taxReports).omit({
  id: true,
  createdAt: true,
  generatedAt: true,
}).extend({
  totalIncome: z.string().or(z.number()).transform(val => String(val)),
  totalExpenses: z.string().or(z.number()).transform(val => String(val)),
  totalDeductions: z.string().or(z.number()).transform(val => String(val)),
  netIncome: z.string().or(z.number()).transform(val => String(val)),
});

export type InsertTaxReport = z.infer<typeof insertTaxReportSchema>;
export type TaxReport = typeof taxReports.$inferSelect;

export const taxForm1099s = pgTable("tax_form_1099s", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  taxYear: integer("tax_year").notNull(),
  vendorId: integer("vendor_id").references(() => vendors.id, { onDelete: 'cascade' }),
  formType: taxFormTypeEnum("form_type").notNull().default('1099_nec'),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull(),
  recipientName: varchar("recipient_name", { length: 255 }).notNull(),
  recipientTin: varchar("recipient_tin", { length: 20 }),
  recipientAddress: text("recipient_address"),
  isFiled: integer("is_filed").notNull().default(0),
  filedDate: timestamp("filed_date"),
  notes: text("notes"),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertTaxForm1099Schema = createInsertSchema(taxForm1099s).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  filedDate: true,
}).extend({
  totalAmount: z.string().or(z.number()).transform(val => String(val)),
  isFiled: z.number().default(0),
});

export type InsertTaxForm1099 = z.infer<typeof insertTaxForm1099Schema>;
export type TaxForm1099 = typeof taxForm1099s.$inferSelect;

// ============================================
// CUSTOM REPORTS
// ============================================

export const customReports = pgTable("custom_reports", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  dataSource: varchar("data_source", { length: 50 }).notNull(), // 'transactions', 'invoices', 'bills', etc.
  selectedFields: jsonb("selected_fields").notNull(), // Array of field names to include
  filters: jsonb("filters"), // Filter configuration object
  groupBy: varchar("group_by", { length: 100 }), // Field to group by (optional)
  sortBy: varchar("sort_by", { length: 100 }), // Field to sort by (optional)
  sortOrder: varchar("sort_order", { length: 10 }).default('desc'), // 'asc' or 'desc'
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCustomReportSchema = createInsertSchema(customReports).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCustomReport = z.infer<typeof insertCustomReportSchema>;
export type CustomReport = typeof customReports.$inferSelect;

// ============================================
// AUDIT LOGS
// ============================================

export const auditLogs = pgTable("audit_logs", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  action: auditActionEnum("action").notNull(),
  entityType: varchar("entity_type", { length: 100 }).notNull(), // e.g., 'transaction', 'invoice', 'bill'
  entityId: varchar("entity_id", { length: 100 }).notNull(), // ID of the affected entity
  oldValues: jsonb("old_values"), // Previous state for updates/deletes
  newValues: jsonb("new_values"), // New state for creates/updates
  changes: text("changes"), // Human-readable summary of changes
  ipAddress: varchar("ip_address", { length: 45 }), // IPv4/IPv6
  userAgent: text("user_agent"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
}, (table) => [
  index("idx_audit_logs_org_id").on(table.organizationId),
  index("idx_audit_logs_user_id").on(table.userId),
  index("idx_audit_logs_entity").on(table.entityType, table.entityId),
  index("idx_audit_logs_timestamp").on(table.timestamp),
]);

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  timestamp: true,
});

export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;

// ============================================
// PAYROLL
// ============================================

export const employees = pgTable("employees", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  employeeNumber: varchar("employee_number", { length: 50 }),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  address: text("address"),
  employmentType: employmentTypeEnum("employment_type").notNull().default('full_time'),
  payType: payTypeEnum("pay_type").notNull().default('salary'),
  payRate: numeric("pay_rate", { precision: 12, scale: 2 }).notNull(), // annual salary or hourly rate
  paySchedule: payScheduleEnum("pay_schedule").notNull().default('biweekly'),
  hireDate: timestamp("hire_date"),
  terminationDate: timestamp("termination_date"),
  bankAccountNumber: varchar("bank_account_number", { length: 100 }), // encrypted in real app
  bankRoutingNumber: varchar("bank_routing_number", { length: 20 }),
  taxWithholdingInfo: jsonb("tax_withholding_info"), // W4 information, state tax, etc.
  notes: text("notes"),
  isActive: integer("is_active").notNull().default(1), // 1 = active, 0 = inactive
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_employees_org_id").on(table.organizationId),
  index("idx_employees_active").on(table.isActive),
]);

export const insertEmployeeSchema = createInsertSchema(employees).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type Employee = typeof employees.$inferSelect;

export const deductions = pgTable("deductions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  type: deductionTypeEnum("type").notNull(),
  calculationType: deductionCalculationTypeEnum("calculation_type").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(), // percentage (e.g., 15.00 for 15%) or fixed amount
  isActive: integer("is_active").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_deductions_org_id").on(table.organizationId),
]);

export const insertDeductionSchema = createInsertSchema(deductions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertDeduction = z.infer<typeof insertDeductionSchema>;
export type Deduction = typeof deductions.$inferSelect;

export const payrollRuns = pgTable("payroll_runs", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  payPeriodStart: timestamp("pay_period_start").notNull(),
  payPeriodEnd: timestamp("pay_period_end").notNull(),
  payDate: timestamp("pay_date").notNull(),
  status: payrollStatusEnum("status").notNull().default('draft'),
  totalGross: numeric("total_gross", { precision: 12, scale: 2 }).notNull().default('0'),
  totalDeductions: numeric("total_deductions", { precision: 12, scale: 2 }).notNull().default('0'),
  totalNet: numeric("total_net", { precision: 12, scale: 2 }).notNull().default('0'),
  notes: text("notes"),
  processedBy: varchar("processed_by").references(() => users.id),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_payroll_runs_org_id").on(table.organizationId),
  index("idx_payroll_runs_status").on(table.status),
  index("idx_payroll_runs_pay_date").on(table.payDate),
]);

export const insertPayrollRunSchema = createInsertSchema(payrollRuns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPayrollRun = z.infer<typeof insertPayrollRunSchema>;
export type PayrollRun = typeof payrollRuns.$inferSelect;

export const payrollItems = pgTable("payroll_items", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  payrollRunId: integer("payroll_run_id").notNull().references(() => payrollRuns.id, { onDelete: 'cascade' }),
  employeeId: integer("employee_id").notNull().references(() => employees.id, { onDelete: 'cascade' }),
  hoursWorked: numeric("hours_worked", { precision: 8, scale: 2 }), // for hourly employees
  grossPay: numeric("gross_pay", { precision: 12, scale: 2 }).notNull(),
  totalDeductions: numeric("total_deductions", { precision: 12, scale: 2 }).notNull().default('0'),
  netPay: numeric("net_pay", { precision: 12, scale: 2 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_payroll_items_run_id").on(table.payrollRunId),
  index("idx_payroll_items_employee_id").on(table.employeeId),
]);

export const insertPayrollItemSchema = createInsertSchema(payrollItems).omit({
  id: true,
  createdAt: true,
});

export type InsertPayrollItem = z.infer<typeof insertPayrollItemSchema>;
export type PayrollItem = typeof payrollItems.$inferSelect;

export const payrollItemDeductions = pgTable("payroll_item_deductions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  payrollItemId: integer("payroll_item_id").notNull().references(() => payrollItems.id, { onDelete: 'cascade' }),
  deductionId: integer("deduction_id").notNull().references(() => deductions.id, { onDelete: 'cascade' }),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_payroll_item_deductions_item_id").on(table.payrollItemId),
  index("idx_payroll_item_deductions_deduction_id").on(table.deductionId),
]);

export const insertPayrollItemDeductionSchema = createInsertSchema(payrollItemDeductions).omit({
  id: true,
  createdAt: true,
});

export type InsertPayrollItemDeduction = z.infer<typeof insertPayrollItemDeductionSchema>;
export type PayrollItemDeduction = typeof payrollItemDeductions.$inferSelect;

// ============================================
// NONPROFIT-SPECIFIC FEATURES
// ============================================

// FUNDS (Restricted vs Unrestricted)
export const funds = pgTable("funds", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: varchar("name", { length: 255 }).notNull(),
  fundType: fundTypeEnum("fund_type").notNull().default('unrestricted'),
  description: text("description"),
  restrictions: text("restrictions"), // Details about restrictions if applicable
  currentBalance: numeric("current_balance", { precision: 12, scale: 2 }).notNull().default('0'),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_funds_organization_id").on(table.organizationId),
]);

export const insertFundSchema = createInsertSchema(funds).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  currentBalance: z.string().or(z.number()).transform(val => String(val)).optional(),
});

export type InsertFund = z.infer<typeof insertFundSchema>;
export type Fund = typeof funds.$inferSelect;

// PROGRAMS (For expense allocation)
export const programs = pgTable("programs", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  status: programStatusEnum("status").notNull().default('active'),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  budget: numeric("budget", { precision: 12, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_programs_organization_id").on(table.organizationId),
]);

export const insertProgramSchema = createInsertSchema(programs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  budget: z.string().or(z.number()).transform(val => String(val)).optional().nullable(),
  startDate: z.coerce.date().optional().nullable(),
  endDate: z.coerce.date().optional().nullable(),
});

export type InsertProgram = z.infer<typeof insertProgramSchema>;
export type Program = typeof programs.$inferSelect;

// PLEDGES (Donor commitments)
export const pledges = pgTable("pledges", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  donorId: integer("donor_id").notNull().references(() => donors.id, { onDelete: 'cascade' }),
  fundId: integer("fund_id").references(() => funds.id, { onDelete: 'set null' }),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  pledgeDate: timestamp("pledge_date").notNull(),
  dueDate: timestamp("due_date"),
  status: pledgeStatusEnum("status").notNull().default('pending'),
  amountPaid: numeric("amount_paid", { precision: 12, scale: 2 }).notNull().default('0'),
  notes: text("notes"),
  paymentSchedule: text("payment_schedule"), // e.g., "Monthly, $100 for 10 months"
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_pledges_organization_id").on(table.organizationId),
  index("idx_pledges_donor_id").on(table.donorId),
  index("idx_pledges_fund_id").on(table.fundId),
]);

export const insertPledgeSchema = createInsertSchema(pledges).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  amount: z.string().or(z.number()).transform(val => String(val)),
  amountPaid: z.string().or(z.number()).transform(val => String(val)).optional(),
  pledgeDate: z.coerce.date(),
  dueDate: z.coerce.date().optional().nullable(),
});

export type InsertPledge = z.infer<typeof insertPledgeSchema>;
export type Pledge = typeof pledges.$inferSelect;

// PLEDGE PAYMENTS (Track payments against pledges)
export const pledgePayments = pgTable("pledge_payments", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  pledgeId: integer("pledge_id").notNull().references(() => pledges.id, { onDelete: 'cascade' }),
  transactionId: integer("transaction_id").references(() => transactions.id, { onDelete: 'set null' }),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  paymentDate: timestamp("payment_date").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_pledge_payments_pledge_id").on(table.pledgeId),
  index("idx_pledge_payments_transaction_id").on(table.transactionId),
]);

export const insertPledgePaymentSchema = createInsertSchema(pledgePayments).omit({
  id: true,
  createdAt: true,
}).extend({
  amount: z.string().or(z.number()).transform(val => String(val)),
  paymentDate: z.coerce.date(),
});

export type InsertPledgePayment = z.infer<typeof insertPledgePaymentSchema>;
export type PledgePayment = typeof pledgePayments.$inferSelect;

// ============================================
// GOVERNMENT CONTRACTS (For-Profit Only)
// ============================================

// Contracts table
export const contracts = pgTable("contracts", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  contractNumber: varchar("contract_number", { length: 100 }).notNull(),
  contractName: varchar("contract_name", { length: 255 }).notNull(),
  clientName: varchar("client_name", { length: 255 }).notNull(),
  description: text("description"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  totalValue: numeric("total_value", { precision: 15, scale: 2 }).notNull(),
  fundedAmount: numeric("funded_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  billedAmount: numeric("billed_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  status: contractStatusEnum("status").notNull().default('pending'),
  contractType: varchar("contract_type", { length: 100 }),
  primeContractor: varchar("prime_contractor", { length: 255 }),
  contractOfficer: varchar("contract_officer", { length: 255 }),
  contactEmail: varchar("contact_email", { length: 255 }),
  contactPhone: varchar("contact_phone", { length: 50 }),
  notes: text("notes"),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertContractSchema = createInsertSchema(contracts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  totalValue: z.string().or(z.number()).transform(val => String(val)),
  fundedAmount: z.string().or(z.number()).transform(val => String(val)).optional(),
  billedAmount: z.string().or(z.number()).transform(val => String(val)).optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional(),
});

export const updateContractSchema = insertContractSchema.partial().omit({
  organizationId: true,
  createdBy: true,
});

export type InsertContract = z.infer<typeof insertContractSchema>;
export type UpdateContract = z.infer<typeof updateContractSchema>;
export type Contract = typeof contracts.$inferSelect;

// Contract Milestones table
export const contractMilestones = pgTable("contract_milestones", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  contractId: integer("contract_id").notNull().references(() => contracts.id),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  milestoneName: varchar("milestone_name", { length: 255 }).notNull(),
  description: text("description"),
  dueDate: timestamp("due_date").notNull(),
  completedDate: timestamp("completed_date"),
  milestoneAmount: numeric("milestone_amount", { precision: 15, scale: 2 }).notNull(),
  status: milestoneStatusEnum("status").notNull().default('pending'),
  notes: text("notes"),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertContractMilestoneSchema = createInsertSchema(contractMilestones).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  milestoneAmount: z.string().or(z.number()).transform(val => String(val)),
  dueDate: z.coerce.date(),
  completedDate: z.coerce.date().optional(),
});

export type InsertContractMilestone = z.infer<typeof insertContractMilestoneSchema>;
export type ContractMilestone = typeof contractMilestones.$inferSelect;

// Projects (Job Costing) table
export const projects = pgTable("projects", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  contractId: integer("contract_id").references(() => contracts.id),
  projectNumber: varchar("project_number", { length: 100 }).notNull(),
  projectName: varchar("project_name", { length: 255 }).notNull(),
  description: text("description"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  budget: numeric("budget", { precision: 15, scale: 2 }),
  actualCost: numeric("actual_cost", { precision: 15, scale: 2 }).notNull().default("0"),
  status: varchar("status", { length: 50 }).notNull().default('active'),
  projectManager: varchar("project_manager", { length: 255 }),
  notes: text("notes"),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  budget: z.string().or(z.number()).transform(val => String(val)).optional(),
  actualCost: z.string().or(z.number()).transform(val => String(val)).optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional(),
});

export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;

// Time Entries (DCAA Compliant) table
export const timeEntries = pgTable("time_entries", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  projectId: integer("project_id").references(() => projects.id),
  contractId: integer("contract_id").references(() => contracts.id),
  taskDescription: text("task_description").notNull(),
  clockInTime: timestamp("clock_in_time").notNull(),
  clockOutTime: timestamp("clock_out_time"),
  totalHours: numeric("total_hours", { precision: 6, scale: 2 }),
  hourlyRate: numeric("hourly_rate", { precision: 10, scale: 2 }),
  laborCost: numeric("labor_cost", { precision: 15, scale: 2 }),
  status: timeEntryStatusEnum("status").notNull().default('draft'),
  location: varchar("location", { length: 255 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertTimeEntrySchema = createInsertSchema(timeEntries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  clockInTime: z.coerce.date(),
  clockOutTime: z.preprocess(
    (val) => val === "" || val === null ? undefined : val,
    z.coerce.date().optional()
  ),
  totalHours: z.preprocess(
    (val) => val === "" || val === null ? undefined : val,
    z.string().or(z.number()).transform(val => String(val)).optional()
  ),
  hourlyRate: z.preprocess(
    (val) => val === "" || val === null ? undefined : val,
    z.string().or(z.number()).transform(val => String(val)).optional()
  ),
  laborCost: z.preprocess(
    (val) => val === "" || val === null ? undefined : val,
    z.string().or(z.number()).transform(val => String(val)).optional()
  ),
});

export type InsertTimeEntry = z.infer<typeof insertTimeEntrySchema>;
export type TimeEntry = typeof timeEntries.$inferSelect;

// Indirect Cost Rates table
export const indirectCostRates = pgTable("indirect_cost_rates", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  rateName: varchar("rate_name", { length: 255 }).notNull(),
  rateType: varchar("rate_type", { length: 100 }).notNull(),
  ratePercentage: numeric("rate_percentage", { precision: 6, scale: 2 }).notNull(),
  effectiveStartDate: timestamp("effective_start_date").notNull(),
  effectiveEndDate: timestamp("effective_end_date"),
  description: text("description"),
  baseType: varchar("base_type", { length: 100 }),
  notes: text("notes"),
  isActive: integer("is_active").notNull().default(1),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertIndirectCostRateSchema = createInsertSchema(indirectCostRates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  ratePercentage: z.string().or(z.number()).transform(val => String(val)),
  effectiveStartDate: z.coerce.date(),
  effectiveEndDate: z.coerce.date().optional(),
});

export type InsertIndirectCostRate = z.infer<typeof insertIndirectCostRateSchema>;
export type IndirectCostRate = typeof indirectCostRates.$inferSelect;

// Project Costs table (for job costing details)
export const projectCosts = pgTable("project_costs", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  projectId: integer("project_id").notNull().references(() => projects.id),
  costDate: timestamp("cost_date").notNull(),
  costType: costTypeEnum("cost_type").notNull(),
  description: text("description").notNull(),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  quantity: numeric("quantity", { precision: 10, scale: 2 }),
  unitCost: numeric("unit_cost", { precision: 15, scale: 2 }),
  vendorName: varchar("vendor_name", { length: 255 }),
  invoiceNumber: varchar("invoice_number", { length: 100 }),
  notes: text("notes"),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertProjectCostSchema = createInsertSchema(projectCosts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  amount: z.string().or(z.number()).transform(val => String(val)),
  quantity: z.string().or(z.number()).transform(val => String(val)).optional(),
  unitCost: z.string().or(z.number()).transform(val => String(val)).optional(),
  costDate: z.coerce.date(),
});

export type InsertProjectCost = z.infer<typeof insertProjectCostSchema>;
export type ProjectCost = typeof projectCosts.$inferSelect;

// ============================================
// RELATIONS
// ============================================

export const usersRelations = relations(users, ({ many }) => ({
  organizationRoles: many(userOrganizationRoles),
  transactions: many(transactions),
}));

export const organizationsRelations = relations(organizations, ({ many }) => ({
  userRoles: many(userOrganizationRoles),
  categories: many(categories),
  transactions: many(transactions),
  grants: many(grants),
}));

export const userOrganizationRolesRelations = relations(userOrganizationRoles, ({ one }) => ({
  user: one(users, {
    fields: [userOrganizationRoles.userId],
    references: [users.id],
  }),
  organization: one(organizations, {
    fields: [userOrganizationRoles.organizationId],
    references: [organizations.id],
  }),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [categories.organizationId],
    references: [organizations.id],
  }),
  parentCategory: one(categories, {
    fields: [categories.parentCategoryId],
    references: [categories.id],
  }),
  transactions: many(transactions),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  organization: one(organizations, {
    fields: [transactions.organizationId],
    references: [organizations.id],
  }),
  category: one(categories, {
    fields: [transactions.categoryId],
    references: [categories.id],
  }),
  grant: one(grants, {
    fields: [transactions.grantId],
    references: [grants.id],
  }),
  creator: one(users, {
    fields: [transactions.createdBy],
    references: [users.id],
  }),
}));

export const grantsRelations = relations(grants, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [grants.organizationId],
    references: [organizations.id],
  }),
  transactions: many(transactions),
}));
