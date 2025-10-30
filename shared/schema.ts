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

// New feature enums
export const inKindDonationTypeEnum = pgEnum('in_kind_donation_type', ['goods', 'services', 'volunteer_hours']);
export const campaignStatusEnum = pgEnum('campaign_status', ['active', 'completed', 'cancelled']);
export const donorTierEnum = pgEnum('donor_tier', ['bronze', 'silver', 'gold', 'platinum', 'none']);
export const proposalStatusEnum = pgEnum('proposal_status', ['draft', 'submitted', 'under_review', 'won', 'lost', 'cancelled']);
export const subcontractorComplianceEnum = pgEnum('subcontractor_compliance', ['compliant', 'expiring_soon', 'non_compliant']);
export const changeOrderStatusEnum = pgEnum('change_order_status', ['requested', 'under_review', 'approved', 'rejected', 'implemented']);
export const documentTypeEnum = pgEnum('document_type', ['contract', 'invoice', 'receipt', 'report', 'certificate', 'grant_document', 'compliance', 'other']);
export const complianceEventTypeEnum = pgEnum('compliance_event_type', ['deadline', 'renewal', 'audit', 'filing', 'review', 'certification']);

// Notification enums
export const notificationTypeEnum = pgEnum('notification_type', [
  'grant_deadline',
  'approval_request',
  'approval_decision',
  'payment_due',
  'payment_received',
  'expense_submitted',
  'report_due',
  'low_budget',
  'user_invited',
  'role_changed',
  'general'
]);

// Security enums (NIST 800-53 AU-2)
export const securityEventTypeEnum = pgEnum('security_event_type', [
  'login_success',
  'login_failure',
  'logout',
  'session_expired',
  'account_locked',
  'account_unlocked',
  'password_reset',
  'unauthorized_access',
  'permission_denied',
  'rate_limit_exceeded',
  'suspicious_activity'
]);

export const securitySeverityEnum = pgEnum('security_severity', [
  'info',
  'warning',
  'critical'
]);

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
// SECURITY EVENT LOG (NIST 800-53 AU-2, AU-3, AU-9)
// ============================================

// Write-once audit log for security events
// Immutable design: No updates or deletes allowed
export const securityEventLog = pgTable("security_event_log", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  eventType: securityEventTypeEnum("event_type").notNull(),
  severity: securitySeverityEnum("severity").notNull().default('info'),
  userId: varchar("user_id").references(() => users.id),
  email: varchar("email"), // Store email for audit trail even if user deleted
  ipAddress: varchar("ip_address"),
  userAgent: varchar("user_agent"),
  eventData: jsonb("event_data"), // Additional context (e.g., failure reason, resource accessed)
  timestamp: timestamp("timestamp").defaultNow().notNull(),
}, (table) => [
  index("idx_security_event_type").on(table.eventType),
  index("idx_security_event_user").on(table.userId),
  index("idx_security_event_timestamp").on(table.timestamp),
  index("idx_security_event_severity").on(table.severity),
]);

export const insertSecurityEventSchema = createInsertSchema(securityEventLog).omit({
  id: true,
  timestamp: true,
});

export type InsertSecurityEvent = z.infer<typeof insertSecurityEventSchema>;
export type SecurityEvent = typeof securityEventLog.$inferSelect;

// ============================================
// FAILED LOGIN TRACKING (NIST 800-53 AC-7)
// ============================================

// Track failed login attempts for account lockout
export const failedLoginAttempts = pgTable("failed_login_attempts", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar("user_id").references(() => users.id),
  email: varchar("email").notNull(), // Email used in login attempt
  ipAddress: varchar("ip_address").notNull(),
  attemptedAt: timestamp("attempted_at").defaultNow().notNull(),
  lockoutUntil: timestamp("lockout_until"), // NULL if not locked, timestamp if locked
}, (table) => [
  index("idx_failed_login_email").on(table.email),
  index("idx_failed_login_user").on(table.userId),
  index("idx_failed_login_ip").on(table.ipAddress),
  index("idx_failed_login_attempted_at").on(table.attemptedAt),
]);

export const insertFailedLoginAttemptSchema = createInsertSchema(failedLoginAttempts).omit({
  id: true,
  attemptedAt: true,
});

export type InsertFailedLoginAttempt = z.infer<typeof insertFailedLoginAttemptSchema>;
export type FailedLoginAttempt = typeof failedLoginAttempts.$inferSelect;

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

// Auto-Approval Rules
export const autoApprovalRules = pgTable("auto_approval_rules", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  isActive: integer("is_active").notNull().default(1),
  maxAmount: numeric("max_amount", { precision: 12, scale: 2 }).notNull(),
  categoryId: integer("category_id").references(() => categories.id, { onDelete: 'set null' }),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertAutoApprovalRuleSchema = createInsertSchema(autoApprovalRules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  maxAmount: z.string().or(z.number()).transform(val => String(val)),
  isActive: z.number().default(1),
});

export type InsertAutoApprovalRule = z.infer<typeof insertAutoApprovalRuleSchema>;
export type AutoApprovalRule = typeof autoApprovalRules.$inferSelect;

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
// NOTIFICATIONS
// ============================================

export const notifications = pgTable("notifications", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: notificationTypeEnum("type").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  relatedEntityType: varchar("related_entity_type", { length: 100 }), // 'grant', 'invoice', 'bill', etc.
  relatedEntityId: varchar("related_entity_id", { length: 100 }), // ID of related entity
  isRead: integer("is_read").notNull().default(0), // 0 = unread, 1 = read
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_notifications_user_id").on(table.userId),
  index("idx_notifications_org_id").on(table.organizationId),
  index("idx_notifications_is_read").on(table.isRead),
  index("idx_notifications_created_at").on(table.createdAt),
]);

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

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
// GOVERNMENT GRANTS (NONPROFIT)
// ============================================

// Time/Effort Reporting table
export const timeEffortReports = pgTable("time_effort_reports", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  employeeId: integer("employee_id").notNull().references(() => employees.id),
  grantId: integer("grant_id").notNull().references(() => grants.id),
  reportingPeriodStart: timestamp("reporting_period_start").notNull(),
  reportingPeriodEnd: timestamp("reporting_period_end").notNull(),
  totalHours: numeric("total_hours", { precision: 10, scale: 2 }).notNull(),
  grantHours: numeric("grant_hours", { precision: 10, scale: 2 }).notNull(),
  otherActivitiesHours: numeric("other_activities_hours", { precision: 10, scale: 2 }),
  percentageEffort: numeric("percentage_effort", { precision: 5, scale: 2 }).notNull(),
  certificationDate: timestamp("certification_date"),
  certifiedBy: varchar("certified_by"),
  notes: text("notes"),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertTimeEffortReportSchema = createInsertSchema(timeEffortReports).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  reportingPeriodStart: z.coerce.date(),
  reportingPeriodEnd: z.coerce.date(),
  totalHours: z.string().or(z.number()).transform(val => String(val)),
  grantHours: z.string().or(z.number()).transform(val => String(val)),
  otherActivitiesHours: z.string().or(z.number()).transform(val => String(val)).optional(),
  percentageEffort: z.string().or(z.number()).transform(val => String(val)),
  certificationDate: z.coerce.date().optional(),
});

export type InsertTimeEffortReport = z.infer<typeof insertTimeEffortReportSchema>;
export type TimeEffortReport = typeof timeEffortReports.$inferSelect;

// Cost Allowability Checks table
export const costAllowabilityChecks = pgTable("cost_allowability_checks", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  transactionId: integer("transaction_id").references(() => transactions.id),
  grantId: integer("grant_id").notNull().references(() => grants.id),
  costCategory: varchar("cost_category", { length: 255 }).notNull(),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  allowabilityStatus: varchar("allowability_status", { length: 50 }).notNull().default('pending'),
  reviewedBy: varchar("reviewed_by"),
  reviewDate: timestamp("review_date"),
  justification: text("justification"),
  notes: text("notes"),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCostAllowabilityCheckSchema = createInsertSchema(costAllowabilityChecks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  amount: z.string().or(z.number()).transform(val => String(val)),
  reviewDate: z.coerce.date().optional(),
});

export type InsertCostAllowabilityCheck = z.infer<typeof insertCostAllowabilityCheckSchema>;
export type CostAllowabilityCheck = typeof costAllowabilityChecks.$inferSelect;

// Sub Awards Monitoring table
export const subAwards = pgTable("sub_awards", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  grantId: integer("grant_id").notNull().references(() => grants.id),
  subrecipientName: varchar("subrecipient_name", { length: 255 }).notNull(),
  subrecipientEIN: varchar("subrecipient_ein", { length: 50 }),
  awardAmount: numeric("award_amount", { precision: 15, scale: 2 }).notNull(),
  awardDate: timestamp("award_date").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  purpose: text("purpose"),
  status: varchar("status", { length: 50 }).notNull().default('active'),
  complianceStatus: varchar("compliance_status", { length: 50 }).notNull().default('compliant'),
  lastMonitoringDate: timestamp("last_monitoring_date"),
  nextMonitoringDate: timestamp("next_monitoring_date"),
  notes: text("notes"),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertSubAwardSchema = createInsertSchema(subAwards).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  awardAmount: z.string().or(z.number()).transform(val => String(val)),
  awardDate: z.coerce.date(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional(),
  lastMonitoringDate: z.coerce.date().optional(),
  nextMonitoringDate: z.coerce.date().optional(),
});

export type InsertSubAward = z.infer<typeof insertSubAwardSchema>;
export type SubAward = typeof subAwards.$inferSelect;

// Federal Financial Reports table
export const federalFinancialReports = pgTable("federal_financial_reports", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  grantId: integer("grant_id").notNull().references(() => grants.id),
  reportingPeriodStart: timestamp("reporting_period_start").notNull(),
  reportingPeriodEnd: timestamp("reporting_period_end").notNull(),
  federalShareExpenditure: numeric("federal_share_expenditure", { precision: 15, scale: 2 }),
  recipientShareExpenditure: numeric("recipient_share_expenditure", { precision: 15, scale: 2 }),
  totalExpenditure: numeric("total_expenditure", { precision: 15, scale: 2 }),
  unliquidatedObligations: numeric("unliquidated_obligations", { precision: 15, scale: 2 }),
  recipientShareUnliquidated: numeric("recipient_share_unliquidated", { precision: 15, scale: 2 }),
  programIncomeEarned: numeric("program_income_earned", { precision: 15, scale: 2 }),
  programIncomeExpended: numeric("program_income_expended", { precision: 15, scale: 2 }),
  status: varchar("status", { length: 50 }).notNull().default('draft'),
  submittedDate: timestamp("submitted_date"),
  approvedDate: timestamp("approved_date"),
  notes: text("notes"),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertFederalFinancialReportSchema = createInsertSchema(federalFinancialReports).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  reportingPeriodStart: z.coerce.date(),
  reportingPeriodEnd: z.coerce.date(),
  federalShareExpenditure: z.string().or(z.number()).transform(val => String(val)).optional(),
  recipientShareExpenditure: z.string().or(z.number()).transform(val => String(val)).optional(),
  totalExpenditure: z.string().or(z.number()).transform(val => String(val)).optional(),
  unliquidatedObligations: z.string().or(z.number()).transform(val => String(val)).optional(),
  recipientShareUnliquidated: z.string().or(z.number()).transform(val => String(val)).optional(),
  programIncomeEarned: z.string().or(z.number()).transform(val => String(val)).optional(),
  programIncomeExpended: z.string().or(z.number()).transform(val => String(val)).optional(),
  submittedDate: z.coerce.date().optional(),
  approvedDate: z.coerce.date().optional(),
});

export type InsertFederalFinancialReport = z.infer<typeof insertFederalFinancialReportSchema>;
export type FederalFinancialReport = typeof federalFinancialReports.$inferSelect;

// Audit Prep Items table
export const auditPrepItems = pgTable("audit_prep_items", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  auditYear: varchar("audit_year", { length: 4 }).notNull(),
  itemType: varchar("item_type", { length: 100 }).notNull(),
  description: text("description").notNull(),
  grantId: integer("grant_id").references(() => grants.id),
  amount: numeric("amount", { precision: 15, scale: 2 }),
  completionStatus: varchar("completion_status", { length: 50 }).notNull().default('not_started'),
  assignedTo: varchar("assigned_to"),
  dueDate: timestamp("due_date"),
  completedDate: timestamp("completed_date"),
  findings: text("findings"),
  notes: text("notes"),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertAuditPrepItemSchema = createInsertSchema(auditPrepItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  amount: z.string().or(z.number()).transform(val => String(val)).optional(),
  dueDate: z.coerce.date().optional(),
  completedDate: z.coerce.date().optional(),
});

export type InsertAuditPrepItem = z.infer<typeof insertAuditPrepItemSchema>;
export type AuditPrepItem = typeof auditPrepItems.$inferSelect;

// ============================================
// NON-PROFIT: IN-KIND DONATIONS
// ============================================

export const inKindDonations = pgTable("in_kind_donations", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  donorId: integer("donor_id").references(() => donors.id, { onDelete: 'set null' }),
  donationType: inKindDonationTypeEnum("donation_type").notNull(),
  description: text("description").notNull(),
  fairMarketValue: numeric("fair_market_value", { precision: 12, scale: 2 }).notNull(),
  quantity: numeric("quantity", { precision: 10, scale: 2 }),
  unitOfMeasure: varchar("unit_of_measure", { length: 50 }),
  volunteerHours: numeric("volunteer_hours", { precision: 8, scale: 2 }),
  hourlyRate: numeric("hourly_rate", { precision: 8, scale: 2 }),
  donationDate: timestamp("donation_date").notNull(),
  programId: integer("program_id").references(() => programs.id, { onDelete: 'set null' }),
  receiptIssued: integer("receipt_issued").notNull().default(0),
  receiptNumber: varchar("receipt_number", { length: 100 }),
  notes: text("notes"),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_in_kind_donations_org_id").on(table.organizationId),
  index("idx_in_kind_donations_donor_id").on(table.donorId),
]);

export const insertInKindDonationSchema = createInsertSchema(inKindDonations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  fairMarketValue: z.string().or(z.number()).transform(val => String(val)),
  quantity: z.string().or(z.number()).transform(val => String(val)).optional().nullable(),
  volunteerHours: z.string().or(z.number()).transform(val => String(val)).optional().nullable(),
  hourlyRate: z.string().or(z.number()).transform(val => String(val)).optional().nullable(),
  donationDate: z.coerce.date(),
  receiptIssued: z.number().default(0),
});

export type InsertInKindDonation = z.infer<typeof insertInKindDonationSchema>;
export type InKindDonation = typeof inKindDonations.$inferSelect;

// ============================================
// NON-PROFIT: FUNDRAISING CAMPAIGNS
// ============================================

export const fundraisingCampaigns = pgTable("fundraising_campaigns", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  goalAmount: numeric("goal_amount", { precision: 12, scale: 2 }).notNull(),
  raisedAmount: numeric("raised_amount", { precision: 12, scale: 2 }).notNull().default('0'),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  status: campaignStatusEnum("status").notNull().default('active'),
  fundId: integer("fund_id").references(() => funds.id, { onDelete: 'set null' }),
  programId: integer("program_id").references(() => programs.id, { onDelete: 'set null' }),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_campaigns_org_id").on(table.organizationId),
  index("idx_campaigns_status").on(table.status),
]);

export const insertFundraisingCampaignSchema = createInsertSchema(fundraisingCampaigns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  raisedAmount: true,
}).extend({
  goalAmount: z.string().or(z.number()).transform(val => String(val)),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional().nullable(),
  status: z.enum(['active', 'completed', 'cancelled']).default('active'),
});

export type InsertFundraisingCampaign = z.infer<typeof insertFundraisingCampaignSchema>;
export type FundraisingCampaign = typeof fundraisingCampaigns.$inferSelect;

export const campaignDonations = pgTable("campaign_donations", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  campaignId: integer("campaign_id").notNull().references(() => fundraisingCampaigns.id, { onDelete: 'cascade' }),
  donorId: integer("donor_id").references(() => donors.id, { onDelete: 'set null' }),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  donationDate: timestamp("donation_date").notNull(),
  channel: varchar("channel", { length: 100 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_campaign_donations_campaign_id").on(table.campaignId),
  index("idx_campaign_donations_donor_id").on(table.donorId),
]);

export const insertCampaignDonationSchema = createInsertSchema(campaignDonations).omit({
  id: true,
  createdAt: true,
}).extend({
  amount: z.string().or(z.number()).transform(val => String(val)),
  donationDate: z.coerce.date(),
});

export type InsertCampaignDonation = z.infer<typeof insertCampaignDonationSchema>;
export type CampaignDonation = typeof campaignDonations.$inferSelect;

// ============================================
// NON-PROFIT: DONOR STEWARDSHIP
// ============================================

export const donorTiers = pgTable("donor_tiers", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  donorId: integer("donor_id").notNull().references(() => donors.id, { onDelete: 'cascade' }),
  tier: donorTierEnum("tier").notNull().default('none'),
  lifetimeGiving: numeric("lifetime_giving", { precision: 12, scale: 2 }).notNull().default('0'),
  lastDonationDate: timestamp("last_donation_date"),
  lastContactDate: timestamp("last_contact_date"),
  isRecurring: integer("is_recurring").notNull().default(0),
  notes: text("notes"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_donor_tiers_org_id").on(table.organizationId),
  index("idx_donor_tiers_donor_id").on(table.donorId),
  index("idx_donor_tiers_tier").on(table.tier),
]);

export const insertDonorTierSchema = createInsertSchema(donorTiers).omit({
  id: true,
  updatedAt: true,
}).extend({
  lifetimeGiving: z.string().or(z.number()).transform(val => String(val)).default('0'),
  lastDonationDate: z.coerce.date().optional().nullable(),
  lastContactDate: z.coerce.date().optional().nullable(),
  tier: z.enum(['bronze', 'silver', 'gold', 'platinum', 'none']).default('none'),
  isRecurring: z.number().default(0),
});

export type InsertDonorTier = z.infer<typeof insertDonorTierSchema>;
export type DonorTier = typeof donorTiers.$inferSelect;

export const thankYouLetters = pgTable("thank_you_letters", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  donorId: integer("donor_id").notNull().references(() => donors.id, { onDelete: 'cascade' }),
  templateName: varchar("template_name", { length: 255 }),
  letterContent: text("letter_content").notNull(),
  sentDate: timestamp("sent_date"),
  sentBy: varchar("sent_by").references(() => users.id),
  relatedDonationAmount: numeric("related_donation_amount", { precision: 12, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_thank_you_letters_org_id").on(table.organizationId),
  index("idx_thank_you_letters_donor_id").on(table.donorId),
]);

export const insertThankYouLetterSchema = createInsertSchema(thankYouLetters).omit({
  id: true,
  createdAt: true,
}).extend({
  sentDate: z.coerce.date().optional().nullable(),
  relatedDonationAmount: z.string().or(z.number()).transform(val => String(val)).optional().nullable(),
});

export type InsertThankYouLetter = z.infer<typeof insertThankYouLetterSchema>;
export type ThankYouLetter = typeof thankYouLetters.$inferSelect;

// ============================================
// FOR-PROFIT: PROPOSAL/BID MANAGEMENT
// ============================================

export const proposals = pgTable("proposals", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  rfpNumber: varchar("rfp_number", { length: 100 }),
  title: varchar("title", { length: 255 }).notNull(),
  clientName: varchar("client_name", { length: 255 }).notNull(),
  description: text("description"),
  proposedValue: numeric("proposed_value", { precision: 15, scale: 2 }),
  estimatedCost: numeric("estimated_cost", { precision: 15, scale: 2 }),
  submissionDeadline: timestamp("submission_deadline"),
  submittedDate: timestamp("submitted_date"),
  decisionDate: timestamp("decision_date"),
  status: proposalStatusEnum("status").notNull().default('draft'),
  winProbability: integer("win_probability"),
  lossReason: text("loss_reason"),
  assignedTo: varchar("assigned_to").references(() => users.id),
  notes: text("notes"),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_proposals_org_id").on(table.organizationId),
  index("idx_proposals_status").on(table.status),
]);

export const insertProposalSchema = createInsertSchema(proposals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  proposedValue: z.string().or(z.number()).transform(val => String(val)).optional().nullable(),
  estimatedCost: z.string().or(z.number()).transform(val => String(val)).optional().nullable(),
  submissionDeadline: z.coerce.date().optional().nullable(),
  submittedDate: z.coerce.date().optional().nullable(),
  decisionDate: z.coerce.date().optional().nullable(),
  status: z.enum(['draft', 'submitted', 'under_review', 'won', 'lost', 'cancelled']).default('draft'),
  winProbability: z.number().min(0).max(100).optional().nullable(),
});

export type InsertProposal = z.infer<typeof insertProposalSchema>;
export type Proposal = typeof proposals.$inferSelect;

// ============================================
// FOR-PROFIT: SUBCONTRACTOR MANAGEMENT
// ============================================

export const subcontractors = pgTable("subcontractors", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  companyName: varchar("company_name", { length: 255 }).notNull(),
  contactName: varchar("contact_name", { length: 255 }),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  address: text("address"),
  taxId: varchar("tax_id", { length: 50 }),
  insuranceExpiration: timestamp("insurance_expiration"),
  certificationsExpiration: timestamp("certifications_expiration"),
  complianceStatus: subcontractorComplianceEnum("compliance_status").notNull().default('compliant'),
  totalPaid: numeric("total_paid", { precision: 15, scale: 2 }).notNull().default('0'),
  notes: text("notes"),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_subcontractors_org_id").on(table.organizationId),
  index("idx_subcontractors_compliance").on(table.complianceStatus),
]);

export const insertSubcontractorSchema = createInsertSchema(subcontractors).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  totalPaid: true,
}).extend({
  insuranceExpiration: z.coerce.date().optional().nullable(),
  certificationsExpiration: z.coerce.date().optional().nullable(),
  complianceStatus: z.enum(['compliant', 'expiring_soon', 'non_compliant']).default('compliant'),
});

export type InsertSubcontractor = z.infer<typeof insertSubcontractorSchema>;
export type Subcontractor = typeof subcontractors.$inferSelect;

export const subcontractorPayments = pgTable("subcontractor_payments", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  subcontractorId: integer("subcontractor_id").notNull().references(() => subcontractors.id, { onDelete: 'cascade' }),
  contractId: integer("contract_id").references(() => contracts.id, { onDelete: 'set null' }),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  paymentDate: timestamp("payment_date").notNull(),
  description: text("description"),
  invoiceNumber: varchar("invoice_number", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_subcontractor_payments_sub_id").on(table.subcontractorId),
]);

export const insertSubcontractorPaymentSchema = createInsertSchema(subcontractorPayments).omit({
  id: true,
  createdAt: true,
}).extend({
  amount: z.string().or(z.number()).transform(val => String(val)),
  paymentDate: z.coerce.date(),
});

export type InsertSubcontractorPayment = z.infer<typeof insertSubcontractorPaymentSchema>;
export type SubcontractorPayment = typeof subcontractorPayments.$inferSelect;

// ============================================
// FOR-PROFIT: CHANGE ORDER MANAGEMENT
// ============================================

export const changeOrders = pgTable("change_orders", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  contractId: integer("contract_id").notNull().references(() => contracts.id, { onDelete: 'cascade' }),
  changeOrderNumber: varchar("change_order_number", { length: 100 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  requestedBy: varchar("requested_by").notNull(),
  requestDate: timestamp("request_date").notNull(),
  originalContractValue: numeric("original_contract_value", { precision: 15, scale: 2 }),
  changeAmount: numeric("change_amount", { precision: 15, scale: 2 }).notNull(),
  newContractValue: numeric("new_contract_value", { precision: 15, scale: 2 }),
  status: changeOrderStatusEnum("status").notNull().default('requested'),
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedDate: timestamp("approved_date"),
  implementedDate: timestamp("implemented_date"),
  notes: text("notes"),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_change_orders_org_id").on(table.organizationId),
  index("idx_change_orders_contract_id").on(table.contractId),
  index("idx_change_orders_status").on(table.status),
]);

export const insertChangeOrderSchema = createInsertSchema(changeOrders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  originalContractValue: z.string().or(z.number()).transform(val => String(val)).optional().nullable(),
  changeAmount: z.string().or(z.number()).transform(val => String(val)),
  newContractValue: z.string().or(z.number()).transform(val => String(val)).optional().nullable(),
  requestDate: z.coerce.date(),
  approvedDate: z.coerce.date().optional().nullable(),
  implementedDate: z.coerce.date().optional().nullable(),
  status: z.enum(['requested', 'under_review', 'approved', 'rejected', 'implemented']).default('requested'),
});

export type InsertChangeOrder = z.infer<typeof insertChangeOrderSchema>;
export type ChangeOrder = typeof changeOrders.$inferSelect;

// ============================================
// UNIVERSAL: BANK RECONCILIATION
// ============================================

export const bankReconciliations = pgTable("bank_reconciliations", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  accountName: varchar("account_name", { length: 255 }).notNull(),
  statementDate: timestamp("statement_date").notNull(),
  statementBalance: numeric("statement_balance", { precision: 15, scale: 2 }).notNull(),
  bookBalance: numeric("book_balance", { precision: 15, scale: 2 }).notNull(),
  difference: numeric("difference", { precision: 15, scale: 2 }).notNull(),
  status: reconciliationStatusEnum("status").notNull().default('unreconciled'),
  reconciledBy: varchar("reconciled_by").references(() => users.id),
  reconciledDate: timestamp("reconciled_date"),
  notes: text("notes"),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_bank_reconciliations_org_id").on(table.organizationId),
  index("idx_bank_reconciliations_status").on(table.status),
]);

export const insertBankReconciliationSchema = createInsertSchema(bankReconciliations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  statementDate: z.coerce.date(),
  statementBalance: z.string().or(z.number()).transform(val => String(val)),
  bookBalance: z.string().or(z.number()).transform(val => String(val)),
  difference: z.string().or(z.number()).transform(val => String(val)),
  reconciledDate: z.coerce.date().optional().nullable(),
  status: z.enum(['unreconciled', 'reconciled', 'pending']).default('unreconciled'),
});

export type InsertBankReconciliation = z.infer<typeof insertBankReconciliationSchema>;
export type BankReconciliation = typeof bankReconciliations.$inferSelect;

export const reconciliationMatches = pgTable("reconciliation_matches", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  reconciliationId: integer("reconciliation_id").notNull().references(() => bankReconciliations.id, { onDelete: 'cascade' }),
  transactionId: integer("transaction_id").references(() => transactions.id, { onDelete: 'set null' }),
  statementDescription: text("statement_description"),
  statementAmount: numeric("statement_amount", { precision: 12, scale: 2 }),
  isMatched: integer("is_matched").notNull().default(0),
  matchedAt: timestamp("matched_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_reconciliation_matches_recon_id").on(table.reconciliationId),
  index("idx_reconciliation_matches_transaction_id").on(table.transactionId),
]);

export const insertReconciliationMatchSchema = createInsertSchema(reconciliationMatches).omit({
  id: true,
  createdAt: true,
}).extend({
  statementAmount: z.string().or(z.number()).transform(val => String(val)).optional().nullable(),
  matchedAt: z.coerce.date().optional().nullable(),
  isMatched: z.number().default(0),
});

export type InsertReconciliationMatch = z.infer<typeof insertReconciliationMatchSchema>;
export type ReconciliationMatch = typeof reconciliationMatches.$inferSelect;

// ============================================
// UNIVERSAL: DOCUMENT MANAGEMENT
// ============================================

export const documents = pgTable("documents", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileUrl: varchar("file_url", { length: 500 }).notNull(),
  fileSize: integer("file_size"),
  mimeType: varchar("mime_type", { length: 100 }),
  documentType: documentTypeEnum("document_type").notNull(),
  relatedEntityType: varchar("related_entity_type", { length: 100 }),
  relatedEntityId: integer("related_entity_id"),
  version: integer("version").notNull().default(1),
  description: text("description"),
  uploadedBy: varchar("uploaded_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_documents_org_id").on(table.organizationId),
  index("idx_documents_entity").on(table.relatedEntityType, table.relatedEntityId),
]);

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  createdAt: true,
}).extend({
  documentType: z.enum(['contract', 'invoice', 'receipt', 'report', 'certificate', 'grant_document', 'compliance', 'other']),
  version: z.number().default(1),
});

export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;

// ============================================
// UNIVERSAL: COMPLIANCE CALENDAR
// ============================================

export const complianceEvents = pgTable("compliance_events", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  eventType: complianceEventTypeEnum("event_type").notNull(),
  dueDate: timestamp("due_date").notNull(),
  completedDate: timestamp("completed_date"),
  relatedEntityType: varchar("related_entity_type", { length: 100 }),
  relatedEntityId: integer("related_entity_id"),
  reminderDays: integer("reminder_days").default(7),
  assignedTo: varchar("assigned_to").references(() => users.id),
  isCompleted: integer("is_completed").notNull().default(0),
  notes: text("notes"),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_compliance_events_org_id").on(table.organizationId),
  index("idx_compliance_events_due_date").on(table.dueDate),
  index("idx_compliance_events_completed").on(table.isCompleted),
]);

export const insertComplianceEventSchema = createInsertSchema(complianceEvents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  eventType: z.enum(['deadline', 'renewal', 'audit', 'filing', 'review', 'certification']),
  dueDate: z.coerce.date(),
  completedDate: z.coerce.date().optional().nullable(),
  reminderDays: z.number().default(7),
  isCompleted: z.number().default(0),
});

export type InsertComplianceEvent = z.infer<typeof insertComplianceEventSchema>;
export type ComplianceEvent = typeof complianceEvents.$inferSelect;

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
