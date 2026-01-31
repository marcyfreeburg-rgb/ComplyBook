// Referenced from javascript_log_in_with_replit and javascript_database blueprints
import { sql, relations } from 'drizzle-orm';
import {
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
  pgEnum,
  boolean,
  date,
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
export const invoiceStatusEnum = pgEnum('invoice_status', ['draft', 'sent', 'emailed', 'needs_to_be_mailed', 'paid', 'partial', 'overdue', 'cancelled']);
export const billStatusEnum = pgEnum('bill_status', ['draft', 'received', 'scheduled', 'paid', 'partial', 'overdue', 'cancelled']);
export const approvalStatusEnum = pgEnum('approval_status', ['pending', 'approved', 'rejected', 'cancelled']);
export const taxFormTypeEnum = pgEnum('tax_form_type', ['1099_nec', '1099_misc', '1099_int', 'w2', '990', '1040_schedule_c']);
export const cashFlowScenarioTypeEnum = pgEnum('cash_flow_scenario_type', ['optimistic', 'realistic', 'pessimistic', 'custom']);
export const auditActionEnum = pgEnum('audit_action', ['create', 'update', 'delete']);
export const reconciliationStatusEnum = pgEnum('reconciliation_status', ['unreconciled', 'reconciled', 'pending']);
export const transactionSourceEnum = pgEnum('transaction_source', ['manual', 'csv_import', 'plaid', 'quickbooks', 'xero']);
export const employmentTypeEnum = pgEnum('employment_type', ['full_time', 'part_time', 'contractor']);
export const payTypeEnum = pgEnum('pay_type', ['salary', 'hourly']);
export const payScheduleEnum = pgEnum('pay_schedule', ['weekly', 'biweekly', 'semimonthly', 'monthly']);
export const payrollStatusEnum = pgEnum('payroll_status', ['draft', 'processed', 'paid']);
export const deductionTypeEnum = pgEnum('deduction_type', ['tax', 'insurance', 'retirement', 'garnishment', 'other']);
export const deductionCalculationTypeEnum = pgEnum('deduction_calculation_type', ['percentage', 'fixed_amount']);

// Nonprofit-specific enums - supports FASB nonprofit accounting classifications
export const fundTypeEnum = pgEnum('fund_type', ['restricted', 'unrestricted', 'temporarily_restricted', 'permanently_restricted']);
export const pledgeStatusEnum = pgEnum('pledge_status', ['pending', 'partial', 'fulfilled', 'cancelled', 'overdue']);
export const functionalCategoryEnum = pgEnum('functional_category', ['program', 'administrative', 'fundraising']);
export const complianceStatusEnum = pgEnum('compliance_status', ['compliant', 'at_risk', 'non_compliant', 'pending_review']);
export const programStatusEnum = pgEnum('program_status', ['active', 'completed', 'on_hold', 'planned']);

// For-profit Government Contracts enums
export const contractStatusEnum = pgEnum('contract_status', ['active', 'completed', 'pending', 'on_hold', 'cancelled']);
export const milestoneStatusEnum = pgEnum('milestone_status', ['pending', 'in_progress', 'completed', 'overdue']);
export const timeEntryStatusEnum = pgEnum('time_entry_status', ['draft', 'submitted', 'approved', 'billed']);
export const costTypeEnum = pgEnum('cost_type', ['direct_labor', 'direct_materials', 'direct_other', 'indirect', 'overhead']);
export const billingMethodEnum = pgEnum('billing_method', ['hourly', 'fixed_fee', 'cost_plus', 'time_and_materials']);
export const revenueStatusEnum = pgEnum('revenue_status', ['unbilled', 'billed', 'recognized', 'written_off']);
export const revenueRecognitionMethodEnum = pgEnum('revenue_recognition_method', ['percentage_completion', 'milestone', 'time_and_materials', 'completed_contract']);

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

// Bill Payment Automation enums
export const autoPayRuleTypeEnum = pgEnum('auto_pay_rule_type', ['vendor', 'amount_threshold', 'due_date', 'combined']);
export const autoPayStatusEnum = pgEnum('auto_pay_status', ['active', 'paused', 'disabled']);
export const scheduledPaymentStatusEnum = pgEnum('scheduled_payment_status', ['pending', 'processing', 'completed', 'failed', 'cancelled']);
export const paymentMethodEnum = pgEnum('payment_method', ['ach', 'card', 'check', 'manual']);

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

// Vulnerability scanning enums (NIST 800-53 RA-5, SI-2)
export const vulnerabilitySeverityEnum = pgEnum('vulnerability_severity', [
  'info',
  'low',
  'moderate',
  'high',
  'critical'
]);

export const scanStatusEnum = pgEnum('scan_status', [
  'running',
  'completed',
  'failed'
]);

// Subscription tier enum
export const subscriptionTierEnum = pgEnum('subscription_tier', [
  'free',
  'core',
  'professional',
  'growth',
  'enterprise'
]);

// ============================================
// SUBSCRIPTION TIER CONFIGURATION
// ============================================

// Define feature keys explicitly for proper type inference
export const TIER_FEATURE_KEYS = [
  'basicReports',
  'plaidSandbox',
  'plaidLive',
  'stripeInvoicing',
  'fundAccounting',
  'form990Export',
  'sf425Export',
  'grantTracking',
  'dcaaTimeTracking',
  'payrollModule',
  'indirectRateCalcs',
  'advancedForecasting',
  'apiAccess',
  'whiteLabel',
  'prioritySupport',
  'dedicatedOnboarding',
  'customIntegrations',
  'recurringTransactions',
  'expenseApprovals',
  'donorBasics',
  'fundraisingBasics',
] as const;

export type TierFeatureKey = typeof TIER_FEATURE_KEYS[number];
export type TierFeatures = Record<TierFeatureKey, boolean>;

export const SUBSCRIPTION_TIERS: Record<string, {
  name: string;
  monthlyPrice: number | null;
  annualPrice: number | null;
  stripePriceIdMonthly?: string | null;
  stripePriceIdAnnual?: string | null;
  maxOrganizations: number | null;
  maxUsers: number | null;
  maxTransactionsPerMonth: number | null;
  features: TierFeatures;
  supportLevel: string;
  description: string;
}> = {
  free: {
    name: 'Free',
    monthlyPrice: 0,
    annualPrice: 0,
    maxOrganizations: 1,
    maxUsers: 2,
    maxTransactionsPerMonth: 500,
    features: {
      basicReports: true,
      plaidSandbox: true,
      plaidLive: false,
      stripeInvoicing: false,
      fundAccounting: false,
      form990Export: false,
      sf425Export: false,
      grantTracking: false,
      dcaaTimeTracking: false,
      payrollModule: false,
      indirectRateCalcs: false,
      advancedForecasting: false,
      apiAccess: false,
      whiteLabel: false,
      prioritySupport: false,
      dedicatedOnboarding: false,
      customIntegrations: false,
      recurringTransactions: false,
      expenseApprovals: false,
      donorBasics: false,
      fundraisingBasics: false,
    },
    supportLevel: 'community',
    description: 'For tiny/testing nonprofits - Core shared features with sandbox integrations',
  },
  core: {
    name: 'Core',
    monthlyPrice: 49,
    annualPrice: 39,
    stripePriceIdMonthly: null as string | null,
    stripePriceIdAnnual: null as string | null,
    maxOrganizations: 5,
    maxUsers: 10,
    maxTransactionsPerMonth: null, // Unlimited
    features: {
      basicReports: true,
      plaidSandbox: true,
      plaidLive: true,
      stripeInvoicing: true,
      fundAccounting: false,
      form990Export: false,
      sf425Export: false,
      grantTracking: false,
      dcaaTimeTracking: false,
      payrollModule: false,
      indirectRateCalcs: false,
      advancedForecasting: false,
      apiAccess: false,
      whiteLabel: false,
      prioritySupport: false,
      dedicatedOnboarding: false,
      customIntegrations: false,
      recurringTransactions: true,
      expenseApprovals: true,
      donorBasics: true,
      fundraisingBasics: true,
    },
    supportLevel: 'email',
    description: 'For small nonprofits (<$750k budget) - Live integrations + unlimited data',
  },
  professional: {
    name: 'Professional',
    monthlyPrice: 129,
    annualPrice: 99,
    stripePriceIdMonthly: null as string | null,
    stripePriceIdAnnual: null as string | null,
    maxOrganizations: null, // Unlimited
    maxUsers: 25,
    maxTransactionsPerMonth: null,
    features: {
      basicReports: true,
      plaidSandbox: true,
      plaidLive: true,
      stripeInvoicing: true,
      fundAccounting: true,
      form990Export: true,
      sf425Export: true,
      grantTracking: true,
      dcaaTimeTracking: true,
      payrollModule: false,
      indirectRateCalcs: true,
      advancedForecasting: false,
      apiAccess: false,
      whiteLabel: false,
      prioritySupport: true,
      dedicatedOnboarding: false,
      customIntegrations: false,
      recurringTransactions: true,
      expenseApprovals: true,
      donorBasics: true,
      fundraisingBasics: true,
    },
    supportLevel: 'priority_chat_email',
    description: 'Audit-ready. Grant-ready. Government-ready. Built for federal reporting & restricted funds.',
  },
  growth: {
    name: 'Growth',
    monthlyPrice: 249,
    annualPrice: 199,
    stripePriceIdMonthly: null as string | null,
    stripePriceIdAnnual: null as string | null,
    maxOrganizations: null,
    maxUsers: 100,
    maxTransactionsPerMonth: null,
    features: {
      basicReports: true,
      plaidSandbox: true,
      plaidLive: true,
      stripeInvoicing: true,
      fundAccounting: true,
      form990Export: true,
      sf425Export: true,
      grantTracking: true,
      dcaaTimeTracking: true,
      payrollModule: true,
      indirectRateCalcs: true,
      advancedForecasting: true,
      apiAccess: true,
      whiteLabel: false,
      prioritySupport: true,
      dedicatedOnboarding: false,
      customIntegrations: false,
      recurringTransactions: true,
      expenseApprovals: true,
      donorBasics: true,
      fundraisingBasics: true,
    },
    supportLevel: '4hr_email_sla',
    description: 'For scaling orgs - Payroll, API access, advanced forecasting',
  },
  enterprise: {
    name: 'Enterprise',
    monthlyPrice: null, // Custom pricing
    annualPrice: null,
    stripePriceIdMonthly: null as string | null,
    stripePriceIdAnnual: null as string | null,
    maxOrganizations: null,
    maxUsers: null, // Unlimited
    maxTransactionsPerMonth: null,
    features: {
      basicReports: true,
      plaidSandbox: true,
      plaidLive: true,
      stripeInvoicing: true,
      fundAccounting: true,
      form990Export: true,
      sf425Export: true,
      grantTracking: true,
      dcaaTimeTracking: true,
      payrollModule: true,
      indirectRateCalcs: true,
      advancedForecasting: true,
      apiAccess: true,
      whiteLabel: true,
      prioritySupport: true,
      dedicatedOnboarding: true,
      customIntegrations: true,
      recurringTransactions: true,
      expenseApprovals: true,
      donorBasics: true,
      fundraisingBasics: true,
    },
    supportLevel: 'phone_sla',
    description: 'For large orgs - White-label, dedicated onboarding, custom integrations',
  },
};

export type SubscriptionTier = keyof typeof SUBSCRIPTION_TIERS;
export type TierConfig = typeof SUBSCRIPTION_TIERS[SubscriptionTier];

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

// User storage table - mandatory for Replit Auth (also supports local auth fallback)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  passwordHash: varchar("password_hash"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  
  // NIST 800-53 IA-2(1), IA-2(2): MFA enforcement for privileged accounts
  mfaRequired: boolean("mfa_required").default(false).notNull(),
  mfaGracePeriodEnd: timestamp("mfa_grace_period_end"),
  lastMfaNotification: timestamp("last_mfa_notification"),
  
  // NIST 800-53 IA-2(1): TOTP-based MFA implementation
  mfaSecret: varchar("mfa_secret"), // Encrypted TOTP secret
  mfaEnabled: boolean("mfa_enabled").default(false).notNull(), // Whether MFA is active
  mfaBackupCodes: jsonb("mfa_backup_codes"), // Hashed backup codes
  mfaVerifiedAt: timestamp("mfa_verified_at"), // When MFA was set up
  
  // Stripe integration & subscription fields
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  subscriptionTier: subscriptionTierEnum("subscription_tier").default('free').notNull(),
  subscriptionStatus: varchar("subscription_status").default('active'), // active, past_due, cancelled, trialing
  subscriptionCurrentPeriodEnd: timestamp("subscription_current_period_end"),
  billingInterval: varchar("billing_interval"), // monthly or annual
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
// VULNERABILITY SCANNING (NIST 800-53 RA-5, SI-2)
// ============================================

// Store vulnerability scan results from npm audit
export const vulnerabilityScans = pgTable("vulnerability_scans", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  status: scanStatusEnum("status").notNull().default('running'),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  totalVulnerabilities: integer("total_vulnerabilities").default(0),
  infoCount: integer("info_count").default(0),
  lowCount: integer("low_count").default(0),
  moderateCount: integer("moderate_count").default(0),
  highCount: integer("high_count").default(0),
  criticalCount: integer("critical_count").default(0),
  scanData: jsonb("scan_data"), // Full npm audit JSON output
  errorMessage: text("error_message"), // If scan failed
}, (table) => [
  index("idx_vuln_scan_status").on(table.status),
  index("idx_vuln_scan_started_at").on(table.startedAt),
]);

export const insertVulnerabilityScanSchema = createInsertSchema(vulnerabilityScans).omit({
  id: true,
  startedAt: true,
});

export type InsertVulnerabilityScan = z.infer<typeof insertVulnerabilityScanSchema>;
export type VulnerabilityScan = typeof vulnerabilityScans.$inferSelect;

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
  // Payment gateway settings
  venmoUsername: varchar("venmo_username", { length: 100 }),
  paypalEmail: varchar("paypal_email", { length: 255 }),
  cashappUsername: varchar("cashapp_username", { length: 100 }),
  stripeEnabled: boolean("stripe_enabled").default(false),
  invoiceCustomFields: jsonb("invoice_custom_fields"),
  fiscalYearStartMonth: integer("fiscal_year_start_month").default(1),
  fiscalYearStartDay: integer("fiscal_year_start_day").default(1),
  defaultBudgetView: varchar("default_budget_view", { length: 50 }).default('current_year'),
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
  parentCategoryId: integer("parent_category_id").references((): any => categories.id, { onDelete: 'set null' }),
  taxDeductible: boolean("tax_deductible").default(true).notNull(), // Whether expenses in this category are tax deductible
  fundType: fundTypeEnum("fund_type").default('unrestricted'), // For nonprofit fund accounting - determines if transactions roll up to restricted or unrestricted
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  idx_categories_org_id: index("idx_categories_org_id").on(table.organizationId),
}));

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
}, (table) => ({
  idx_vendors_org_id: index("idx_vendors_org_id").on(table.organizationId),
}));

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
}, (table) => ({
  idx_clients_org_id: index("idx_clients_org_id").on(table.organizationId),
}));

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
}, (table) => ({
  idx_donors_org_id: index("idx_donors_org_id").on(table.organizationId),
}));

export const insertDonorSchema = createInsertSchema(donors).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertDonor = z.infer<typeof insertDonorSchema>;
export type Donor = typeof donors.$inferSelect;

// Donor Letters Type Enum
export const donorLetterTypeEnum = pgEnum('donor_letter_type', ['general', 'custom']);
export const donorLetterStatusEnum = pgEnum('donor_letter_status', ['draft', 'finalized', 'void']);

export const donorLetters = pgTable("donor_letters", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  donorId: integer("donor_id").notNull().references(() => donors.id, { onDelete: 'cascade' }),
  year: integer("year").notNull(),
  letterType: donorLetterTypeEnum("letter_type").notNull().default('general'),
  letterStatus: donorLetterStatusEnum("letter_status").notNull().default('draft'),
  donationAmount: numeric("donation_amount", { precision: 12, scale: 2 }).notNull(),
  customContent: text("custom_content"),
  renderedHtml: text("rendered_html"),
  deliveryMode: varchar("delivery_mode", { length: 50 }),
  deliveryRef: varchar("delivery_ref", { length: 255 }),
  generatedAt: timestamp("generated_at"),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertDonorLetterSchema = createInsertSchema(donorLetters).omit({
  id: true,
  createdBy: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  donationAmount: z.string().or(z.number()).transform(val => String(val)),
});

export type InsertDonorLetter = z.infer<typeof insertDonorLetterSchema>;
export type DonorLetter = typeof donorLetters.$inferSelect;

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
  stripePaymentIntentId: varchar("stripe_payment_intent_id"),
  stripeCheckoutSessionId: varchar("stripe_checkout_session_id"),
  paymentUrl: varchar("payment_url"),
  paidAt: timestamp("paid_at"),
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
  status: z.enum(['draft', 'sent', 'paid', 'overdue', 'cancelled']).optional(),
  paidAt: z.coerce.date().optional().nullable(),
  stripePaymentIntentId: z.string().optional().nullable(),
  stripeCheckoutSessionId: z.string().optional().nullable(),
  paymentUrl: z.string().optional().nullable(),
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
  billNumber: varchar("bill_number", { length: 100 }).notNull(), // Can be bill number or account number
  issueDate: timestamp("issue_date").notNull(),
  dueDate: timestamp("due_date").notNull(),
  status: billStatusEnum("status").notNull().default('received'),
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull(),
  taxAmount: numeric("tax_amount", { precision: 12, scale: 2 }),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull(),
  notes: text("notes"),
  // Fund allocation for nonprofits - track payment source
  fundingSource: varchar("funding_source", { length: 50 }).default('unrestricted'), // 'unrestricted' or 'grant'
  grantId: integer("grant_id").references(() => grants.id, { onDelete: 'set null' }), // If funded by specific grant
  // Recurring bill settings
  isRecurring: boolean("is_recurring").default(false),
  recurringFrequency: recurringFrequencyEnum("recurring_frequency"), // daily, weekly, biweekly, monthly, quarterly, yearly
  recurringEndDate: timestamp("recurring_end_date"), // When to stop generating recurring bills
  parentBillId: integer("parent_bill_id"), // Reference to original recurring bill template
  transactionId: integer("transaction_id").references(() => transactions.id, { onDelete: 'set null' }),
  aiSuggested: boolean("ai_suggested").default(false), // True if this bill was created from AI pattern detection
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
  fundingSource: z.enum(['unrestricted', 'grant']).optional().default('unrestricted'),
  grantId: z.number().optional().nullable(),
  isRecurring: z.boolean().optional().default(false),
  recurringFrequency: z.enum(['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly']).optional().nullable(),
  recurringEndDate: z.coerce.date().optional().nullable(),
  parentBillId: z.number().optional().nullable(),
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
  categoryId: integer("category_id").references(() => categories.id, { onDelete: 'set null' }),
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
  categoryId: z.number().optional().nullable(),
});

export type InsertBillLineItem = z.infer<typeof insertBillLineItemSchema>;
export type BillLineItem = typeof billLineItems.$inferSelect;

// ============================================
// DISMISSED RECURRING PATTERNS
// ============================================
// Track patterns that users have dismissed/ignored to avoid showing them again

export const dismissedPatterns = pgTable("dismissed_patterns", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  vendorName: varchar("vendor_name", { length: 255 }).notNull(),
  patternType: transactionTypeEnum("pattern_type").notNull(), // income or expense
  frequency: recurringFrequencyEnum("frequency"), // The detected frequency that was dismissed
  averageAmount: numeric("average_amount", { precision: 12, scale: 2 }), // Approximate amount for matching
  reason: varchar("reason", { length: 50 }), // 'not_recurring', 'one_time', 'already_tracked', 'other'
  dismissedBy: varchar("dismissed_by").notNull().references(() => users.id),
  dismissedAt: timestamp("dismissed_at").defaultNow().notNull(),
}, (table) => [
  index("idx_dismissed_patterns_org").on(table.organizationId),
  index("idx_dismissed_patterns_vendor").on(table.organizationId, table.vendorName),
]);

export const insertDismissedPatternSchema = createInsertSchema(dismissedPatterns).omit({
  id: true,
  dismissedBy: true,
  dismissedAt: true,
});

export type InsertDismissedPattern = z.infer<typeof insertDismissedPatternSchema>;
export type DismissedPattern = typeof dismissedPatterns.$inferSelect;

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
  source: transactionSourceEnum("source").notNull().default('manual'),
  externalId: varchar("external_id", { length: 255 }),
  importBatchId: varchar("import_batch_id", { length: 255 }),
  bankAccountId: integer("bank_account_id").references(() => plaidAccounts.id, { onDelete: 'set null' }),
  // Transaction split fields - for splitting a transaction into multiple categorized parts
  parentTransactionId: integer("parent_transaction_id"),
  hasSplits: boolean("has_splits").notNull().default(false),
  isSplitChild: boolean("is_split_child").notNull().default(false),
  originalAmount: numeric("original_amount", { precision: 12, scale: 2 }),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_transactions_org_id").on(table.organizationId),
  index("idx_transactions_org_date").on(table.organizationId, table.date),
  index("idx_transactions_org_type").on(table.organizationId, table.type),
  index("idx_transactions_org_category").on(table.organizationId, table.categoryId),
  index("idx_transactions_org_reconciliation").on(table.organizationId, table.reconciliationStatus),
  index("idx_transactions_org_fund").on(table.organizationId, table.fundId),
  index("idx_transactions_org_program").on(table.organizationId, table.programId),
  index("idx_transactions_org_donor").on(table.organizationId, table.donorId),
  index("idx_transactions_date").on(table.date),
  index("idx_transactions_external_id").on(table.organizationId, table.externalId),
  index("idx_transactions_duplicate_check").on(table.organizationId, table.date, table.amount, table.type),
  index("idx_transactions_monthly_trends").on(table.organizationId, table.type, table.date),
]);

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

export const splitTransactionItemSchema = z.object({
  amount: z.string().or(z.number()).transform(val => String(val)),
  description: z.string().optional(),
  categoryId: z.number().optional().nullable(),
  grantId: z.number().optional().nullable(),
  fundId: z.number().optional().nullable(),
  programId: z.number().optional().nullable(),
  functionalCategory: z.enum(['program', 'administrative', 'fundraising']).optional().nullable(),
});

export const splitTransactionSchema = z.object({
  splits: z.array(splitTransactionItemSchema).min(2, "At least 2 splits required"),
});

export type SplitTransactionItem = z.infer<typeof splitTransactionItemSchema>;
export type SplitTransactionInput = z.infer<typeof splitTransactionSchema>;

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
  fundType: fundTypeEnum("fund_type").notNull().default('unrestricted'), // For fund accounting rollup
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
}, (table) => ({
  idx_grants_org_id: index("idx_grants_org_id").on(table.organizationId),
}));

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

export const updateGrantSchema = insertGrantSchema.partial();

export type InsertGrant = z.infer<typeof insertGrantSchema>;
export type UpdateGrant = z.infer<typeof updateGrantSchema>;
export type Grant = typeof grants.$inferSelect;

// ============================================
// BUDGETS
// ============================================

export const budgets = pgTable("budgets", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  grantId: integer("grant_id").references(() => grants.id, { onDelete: 'set null' }),
  fundId: integer("fund_id"),
  programId: integer("program_id"),
  contractId: integer("contract_id"),
  departmentName: varchar("department_name", { length: 255 }),
  name: varchar("name", { length: 255 }).notNull(),
  period: budgetPeriodEnum("period").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  additionalFunds: numeric("additional_funds", { precision: 12, scale: 2 }).default("0"),
  additionalFundsDescription: text("additional_funds_description"),
  alertAt50: boolean("alert_at_50").default(false),
  alertAt75: boolean("alert_at_75").default(true),
  alertAt90: boolean("alert_at_90").default(true),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  idx_budgets_org_id: index("idx_budgets_org_id").on(table.organizationId),
}));

export const insertBudgetSchema = createInsertSchema(budgets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  additionalFunds: z.string().or(z.number()).transform(val => {
    if (val === "" || val === null || val === undefined) return "0";
    return String(val);
  }).optional().nullable(),
  additionalFundsDescription: z.string().transform(val => val === "" ? null : val).optional().nullable(),
  fundId: z.number().optional().nullable(),
  programId: z.number().optional().nullable(),
  contractId: z.number().optional().nullable(),
  departmentName: z.string().optional().nullable(),
  alertAt50: z.boolean().optional(),
  alertAt75: z.boolean().optional(),
  alertAt90: z.boolean().optional(),
});

export type InsertBudget = z.infer<typeof insertBudgetSchema>;
export type Budget = typeof budgets.$inferSelect;

export const budgetItems = pgTable("budget_items", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  budgetId: integer("budget_id").notNull().references(() => budgets.id, { onDelete: 'cascade' }),
  categoryId: integer("category_id").notNull().references(() => categories.id, { onDelete: 'cascade' }),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  notes: text("notes"),
  alertAt50: boolean("alert_at_50").default(false),
  alertAt75: boolean("alert_at_75").default(true),
  alertAt90: boolean("alert_at_90").default(true),
  hardStop: boolean("hard_stop").default(false),
  isLocked: boolean("is_locked").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertBudgetItemSchema = createInsertSchema(budgetItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  amount: z.string().or(z.number()).transform(val => String(val)),
  notes: z.string().optional().nullable(),
  alertAt50: z.boolean().optional(),
  alertAt75: z.boolean().optional(),
  alertAt90: z.boolean().optional(),
  hardStop: z.boolean().optional(),
  isLocked: z.boolean().optional(),
});

export type InsertBudgetItem = z.infer<typeof insertBudgetItemSchema>;
export type BudgetItem = typeof budgetItems.$inferSelect;

export const budgetIncomeItems = pgTable("budget_income_items", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  budgetId: integer("budget_id").notNull().references(() => budgets.id, { onDelete: 'cascade' }),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  sourceName: varchar("source_name", { length: 255 }).notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  expectedDate: date("expected_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertBudgetIncomeItemSchema = createInsertSchema(budgetIncomeItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  amount: z.string().or(z.number()).transform(val => String(val)),
  expectedDate: z.string().optional().nullable(),
});

export type InsertBudgetIncomeItem = z.infer<typeof insertBudgetIncomeItemSchema>;
export type BudgetIncomeItem = typeof budgetIncomeItems.$inferSelect;

// ============================================
// BUDGET ALERTS
// ============================================

export const budgetAlertTypeEnum = pgEnum("budget_alert_type", ["threshold_50", "threshold_75", "threshold_90", "over_budget", "burn_rate"]);

export const budgetAlerts = pgTable("budget_alerts", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  budgetId: integer("budget_id").notNull().references(() => budgets.id, { onDelete: 'cascade' }),
  budgetItemId: integer("budget_item_id").references(() => budgetItems.id, { onDelete: 'cascade' }),
  alertType: budgetAlertTypeEnum("alert_type").notNull(),
  percentUsed: numeric("percent_used", { precision: 6, scale: 2 }).notNull(),
  projectedOverage: numeric("projected_overage", { precision: 12, scale: 2 }),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
  sentTo: text("sent_to").notNull(),
  acknowledged: boolean("acknowledged").default(false),
  acknowledgedAt: timestamp("acknowledged_at"),
  acknowledgedBy: varchar("acknowledged_by").references(() => users.id),
}, (table) => ({
  idx_budget_alerts_budget: index("idx_budget_alerts_budget").on(table.budgetId),
  idx_budget_alerts_item: index("idx_budget_alerts_item").on(table.budgetItemId),
  idx_budget_alerts_type: index("idx_budget_alerts_type").on(table.alertType),
}));

export const insertBudgetAlertSchema = createInsertSchema(budgetAlerts).omit({
  id: true,
  sentAt: true,
}).extend({
  percentUsed: z.string().or(z.number()).transform(val => String(val)),
  projectedOverage: z.string().or(z.number()).transform(val => String(val)).optional().nullable(),
});

export type InsertBudgetAlert = z.infer<typeof insertBudgetAlertSchema>;
export type BudgetAlert = typeof budgetAlerts.$inferSelect;

// ============================================
// RECONCILIATION AUDIT LOGS
// ============================================

export const reconciliationActionEnum = pgEnum("reconciliation_action", [
  "reconciled",
  "unreconciled",
  "balance_adjusted",
  "difference_noted",
  "bulk_reconciled"
]);

export const reconciliationAuditLogs = pgTable("reconciliation_audit_logs", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  transactionId: integer("transaction_id").references(() => transactions.id, { onDelete: 'set null' }),
  bankAccountId: integer("bank_account_id").references(() => plaidAccounts.id, { onDelete: 'set null' }),
  action: reconciliationActionEnum("action").notNull(),
  previousStatus: varchar("previous_status", { length: 50 }),
  newStatus: varchar("new_status", { length: 50 }),
  previousBalance: numeric("previous_balance", { precision: 12, scale: 2 }),
  newBalance: numeric("new_balance", { precision: 12, scale: 2 }),
  difference: numeric("difference", { precision: 12, scale: 2 }),
  notes: text("notes"),
  performedBy: varchar("performed_by").notNull().references(() => users.id),
  performedAt: timestamp("performed_at").defaultNow().notNull(),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
}, (table) => ({
  idx_recon_audit_org: index("idx_recon_audit_org").on(table.organizationId),
  idx_recon_audit_tx: index("idx_recon_audit_tx").on(table.transactionId),
  idx_recon_audit_account: index("idx_recon_audit_account").on(table.bankAccountId),
  idx_recon_audit_date: index("idx_recon_audit_date").on(table.performedAt),
}));

export const insertReconciliationAuditLogSchema = createInsertSchema(reconciliationAuditLogs).omit({
  id: true,
  performedAt: true,
});

export type InsertReconciliationAuditLog = z.infer<typeof insertReconciliationAuditLogSchema>;
export type ReconciliationAuditLog = typeof reconciliationAuditLogs.$inferSelect;

// ============================================
// RECONCILIATION ALERTS
// ============================================

export const reconciliationAlertTypeEnum = pgEnum("reconciliation_alert_type", [
  "stale_unreconciled",     // Items unreconciled > 30 days
  "balance_difference",      // Non-zero balance difference
  "large_difference",        // Large variance (configurable threshold)
  "missing_transactions"     // Bank transactions not matched
]);

export const reconciliationAlerts = pgTable("reconciliation_alerts", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  bankAccountId: integer("bank_account_id").references(() => plaidAccounts.id, { onDelete: 'cascade' }),
  transactionId: integer("transaction_id").references(() => transactions.id, { onDelete: 'cascade' }),
  alertType: reconciliationAlertTypeEnum("alert_type").notNull(),
  daysSinceCreation: integer("days_since_creation"),
  differenceAmount: numeric("difference_amount", { precision: 12, scale: 2 }),
  description: text("description").notNull(),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
  sentTo: text("sent_to").notNull(),
  acknowledged: boolean("acknowledged").default(false),
  acknowledgedAt: timestamp("acknowledged_at"),
  acknowledgedBy: varchar("acknowledged_by").references(() => users.id),
}, (table) => ({
  idx_recon_alerts_org: index("idx_recon_alerts_org").on(table.organizationId),
  idx_recon_alerts_type: index("idx_recon_alerts_type").on(table.alertType),
  idx_recon_alerts_account: index("idx_recon_alerts_account").on(table.bankAccountId),
}));

export const insertReconciliationAlertSchema = createInsertSchema(reconciliationAlerts).omit({
  id: true,
  sentAt: true,
});

export type InsertReconciliationAlert = z.infer<typeof insertReconciliationAlertSchema>;
export type ReconciliationAlert = typeof reconciliationAlerts.$inferSelect;

// ============================================
// PLAID INTEGRATIONS
// ============================================

export const plaidItemStatusEnum = pgEnum("plaid_item_status", ["active", "login_required", "error", "pending"]);

export const plaidItems = pgTable("plaid_items", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  itemId: varchar("item_id", { length: 255 }).notNull().unique(),
  accessToken: text("access_token").notNull(),
  institutionId: varchar("institution_id", { length: 255 }),
  institutionName: varchar("institution_name", { length: 255 }),
  status: plaidItemStatusEnum("status").default("active").notNull(),
  errorCode: varchar("error_code", { length: 100 }),
  errorMessage: text("error_message"),
  lastSyncedAt: timestamp("last_synced_at"),
  cursor: text("cursor"),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  idx_plaid_items_org_id: index("idx_plaid_items_org_id").on(table.organizationId),
}));

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
  persistentAccountId: varchar("persistent_account_id", { length: 255 }),
  accountNumberEncrypted: text("account_number_encrypted"),
  routingNumberEncrypted: text("routing_number_encrypted"),
  wireRoutingNumberEncrypted: text("wire_routing_number_encrypted"),
  ownerNames: text("owner_names").array(),
  ownerEmails: text("owner_emails").array(),
  ownerPhoneNumbers: text("owner_phone_numbers").array(),
  ownerAddresses: jsonb("owner_addresses"),
  authFetchedAt: timestamp("auth_fetched_at"),
  identityFetchedAt: timestamp("identity_fetched_at"),
  initialBalance: numeric("initial_balance", { precision: 12, scale: 2 }),
  initialBalanceDate: date("initial_balance_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  idx_plaid_accounts_item_id: index("idx_plaid_accounts_item_id").on(table.plaidItemId),
}));

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
  donationGrowthRate: numeric("donation_growth_rate", { precision: 5, scale: 2 }).default('0'),
  grantGrowthRate: numeric("grant_growth_rate", { precision: 5, scale: 2 }).default('0'),
  seasonalAdjustments: jsonb("seasonal_adjustments"),
  assumptions: text("assumptions"),
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
  previousHash: varchar("previous_hash", { length: 64 }), // SHA-256 hash of previous audit log entry
  chainHash: varchar("chain_hash", { length: 64 }), // SHA-256 hash of this entry (for tamper detection)
  
  // NIST 800-53 AU-11: Audit log retention (90-day active, 7-year archival)
  archived: boolean("archived").default(false).notNull(),
  archivedAt: timestamp("archived_at"),
}, (table) => [
  index("idx_audit_logs_org_id").on(table.organizationId),
  index("idx_audit_logs_user_id").on(table.userId),
  index("idx_audit_logs_entity").on(table.entityType, table.entityId),
  index("idx_audit_logs_timestamp").on(table.timestamp),
  index("idx_audit_logs_archived").on(table.archived, table.timestamp),
]);

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  timestamp: true,
  previousHash: true,
  chainHash: true,
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
// TEAMS
// ============================================

export const teams = pgTable("teams", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  isActive: integer("is_active").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_teams_org_id").on(table.organizationId),
]);

export const insertTeamSchema = createInsertSchema(teams).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type Team = typeof teams.$inferSelect;

// ============================================
// PAYROLL
// ============================================

export const employees = pgTable("employees", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  teamId: integer("team_id").references(() => teams.id, { onDelete: 'set null' }),
  isTeamLeader: integer("is_team_leader").notNull().default(0), // 1 = team leader/manager, 0 = regular member
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
  index("idx_employees_team_id").on(table.teamId),
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

// ============================================
// MILEAGE TRACKING
// ============================================

// Mileage rates table (IRS rates by year)
export const mileageRates = pgTable("mileage_rates", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: varchar("name", { length: 100 }).notNull(), // e.g., "IRS Standard Rate 2024", "Custom Rate"
  ratePerMile: numeric("rate_per_mile", { precision: 6, scale: 4 }).notNull(), // e.g., 0.6700 for $0.67/mile
  effectiveDate: timestamp("effective_date").notNull(),
  expirationDate: timestamp("expiration_date"),
  isDefault: boolean("is_default").notNull().default(false),
  rateType: varchar("rate_type", { length: 50 }).notNull().default('business'), // business, medical, charity
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_mileage_rates_org_id").on(table.organizationId),
]);

export const insertMileageRateSchema = createInsertSchema(mileageRates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  ratePerMile: z.string().or(z.number()).transform(val => String(val)),
  effectiveDate: z.coerce.date(),
  expirationDate: z.coerce.date().optional().nullable(),
});

export type InsertMileageRate = z.infer<typeof insertMileageRateSchema>;
export type MileageRate = typeof mileageRates.$inferSelect;

// Mileage expenses table
export const mileageExpenses = pgTable("mileage_expenses", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  mileageRateId: integer("mileage_rate_id").references(() => mileageRates.id, { onDelete: 'set null' }),
  programId: integer("program_id").references(() => programs.id, { onDelete: 'set null' }),
  transactionId: integer("transaction_id").references(() => transactions.id, { onDelete: 'set null' }),
  tripDate: timestamp("trip_date").notNull(),
  startLocation: varchar("start_location", { length: 255 }).notNull(),
  endLocation: varchar("end_location", { length: 255 }).notNull(),
  roundTrip: boolean("round_trip").notNull().default(false),
  miles: numeric("miles", { precision: 8, scale: 2 }).notNull(),
  rateApplied: numeric("rate_applied", { precision: 6, scale: 4 }).notNull(),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull(),
  purpose: text("purpose").notNull(),
  vehicleInfo: varchar("vehicle_info", { length: 255 }), // Optional vehicle info
  status: varchar("status", { length: 50 }).notNull().default('pending'), // pending, approved, rejected, reimbursed
  approvedBy: varchar("approved_by").references(() => users.id, { onDelete: 'set null' }),
  approvedAt: timestamp("approved_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_mileage_expenses_org_id").on(table.organizationId),
  index("idx_mileage_expenses_user_id").on(table.userId),
  index("idx_mileage_expenses_program_id").on(table.programId),
  index("idx_mileage_expenses_status").on(table.status),
]);

export const insertMileageExpenseSchema = createInsertSchema(mileageExpenses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  totalAmount: true,
  approvedBy: true,
  approvedAt: true,
}).extend({
  tripDate: z.coerce.date(),
  miles: z.string().or(z.number()).transform(val => String(val)),
  rateApplied: z.string().or(z.number()).transform(val => String(val)),
});

export type InsertMileageExpense = z.infer<typeof insertMileageExpenseSchema>;
export type MileageExpense = typeof mileageExpenses.$inferSelect;

// ============================================
// PER DIEM RULES
// ============================================

// Per diem rates by location
export const perDiemRates = pgTable("per_diem_rates", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: varchar("name", { length: 255 }).notNull(), // e.g., "GSA Rate - Washington DC"
  location: varchar("location", { length: 255 }).notNull(), // City, State or region
  lodgingRate: numeric("lodging_rate", { precision: 10, scale: 2 }).notNull(),
  mieRate: numeric("mie_rate", { precision: 10, scale: 2 }).notNull(), // Meals & Incidental Expenses
  breakfastRate: numeric("breakfast_rate", { precision: 10, scale: 2 }),
  lunchRate: numeric("lunch_rate", { precision: 10, scale: 2 }),
  dinnerRate: numeric("dinner_rate", { precision: 10, scale: 2 }),
  incidentalsRate: numeric("incidentals_rate", { precision: 10, scale: 2 }),
  effectiveDate: timestamp("effective_date").notNull(),
  expirationDate: timestamp("expiration_date"),
  isDefault: boolean("is_default").notNull().default(false),
  fiscalYear: integer("fiscal_year"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_per_diem_rates_org_id").on(table.organizationId),
  index("idx_per_diem_rates_location").on(table.location),
]);

export const insertPerDiemRateSchema = createInsertSchema(perDiemRates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  lodgingRate: z.string().or(z.number()).transform(val => String(val)),
  mieRate: z.string().or(z.number()).transform(val => String(val)),
  breakfastRate: z.string().or(z.number()).transform(val => String(val)).optional().nullable(),
  lunchRate: z.string().or(z.number()).transform(val => String(val)).optional().nullable(),
  dinnerRate: z.string().or(z.number()).transform(val => String(val)).optional().nullable(),
  incidentalsRate: z.string().or(z.number()).transform(val => String(val)).optional().nullable(),
  effectiveDate: z.coerce.date(),
  expirationDate: z.coerce.date().optional().nullable(),
});

export type InsertPerDiemRate = z.infer<typeof insertPerDiemRateSchema>;
export type PerDiemRate = typeof perDiemRates.$inferSelect;

// Per diem expense claims
export const perDiemExpenses = pgTable("per_diem_expenses", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  perDiemRateId: integer("per_diem_rate_id").references(() => perDiemRates.id, { onDelete: 'set null' }),
  programId: integer("program_id").references(() => programs.id, { onDelete: 'set null' }),
  transactionId: integer("transaction_id").references(() => transactions.id, { onDelete: 'set null' }),
  travelDate: timestamp("travel_date").notNull(),
  location: varchar("location", { length: 255 }).notNull(),
  tripPurpose: text("trip_purpose").notNull(),
  // Day type affects rates (first/last day get 75%, full days get 100%)
  dayType: varchar("day_type", { length: 50 }).notNull().default('full'), // first, last, full, single
  // Claimed amounts (may be less than max allowed)
  lodgingClaimed: numeric("lodging_claimed", { precision: 10, scale: 2 }).default('0'),
  mealsClaimed: numeric("meals_claimed", { precision: 10, scale: 2 }).default('0'),
  incidentalsClaimed: numeric("incidentals_claimed", { precision: 10, scale: 2 }).default('0'),
  totalClaimed: numeric("total_claimed", { precision: 12, scale: 2 }).notNull(),
  // Meals provided by others (reduce claim)
  breakfastProvided: boolean("breakfast_provided").notNull().default(false),
  lunchProvided: boolean("lunch_provided").notNull().default(false),
  dinnerProvided: boolean("dinner_provided").notNull().default(false),
  status: varchar("status", { length: 50 }).notNull().default('pending'), // pending, approved, rejected, reimbursed
  approvedBy: varchar("approved_by").references(() => users.id, { onDelete: 'set null' }),
  approvedAt: timestamp("approved_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_per_diem_expenses_org_id").on(table.organizationId),
  index("idx_per_diem_expenses_user_id").on(table.userId),
  index("idx_per_diem_expenses_program_id").on(table.programId),
  index("idx_per_diem_expenses_status").on(table.status),
]);

export const insertPerDiemExpenseSchema = createInsertSchema(perDiemExpenses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  approvedBy: true,
  approvedAt: true,
}).extend({
  travelDate: z.coerce.date(),
  lodgingClaimed: z.string().or(z.number()).transform(val => String(val)).optional(),
  mealsClaimed: z.string().or(z.number()).transform(val => String(val)).optional(),
  incidentalsClaimed: z.string().or(z.number()).transform(val => String(val)).optional(),
  totalClaimed: z.string().or(z.number()).transform(val => String(val)),
});

export type InsertPerDiemExpense = z.infer<typeof insertPerDiemExpenseSchema>;
export type PerDiemExpense = typeof perDiemExpenses.$inferSelect;

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
  proposalId: integer("proposal_id"),
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
}, (table) => [
  index("idx_contracts_proposal_id").on(table.proposalId),
]);

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
  projectType: varchar("project_type", { length: 100 }),
  billingMethod: varchar("billing_method", { length: 100 }),
  laborRate: numeric("labor_rate", { precision: 10, scale: 2 }),
  overheadRate: numeric("overhead_rate", { precision: 6, scale: 2 }),
  clonedFromId: integer("cloned_from_id"),
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
  budget: z.string().or(z.number()).transform(val => String(val)).nullable().optional(),
  actualCost: z.string().or(z.number()).transform(val => String(val)).nullable().optional(),
  laborRate: z.string().or(z.number()).transform(val => String(val)).nullable().optional(),
  overheadRate: z.string().or(z.number()).transform(val => String(val)).nullable().optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().nullable().optional(),
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

// Labor Burden Rates table (for tracking fringe, overhead, G&A)
export const laborBurdenRates = pgTable("labor_burden_rates", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  rateName: varchar("rate_name", { length: 255 }).notNull(),
  employeeId: integer("employee_id").references(() => employees.id),
  roleName: varchar("role_name", { length: 100 }),
  fringePercentage: numeric("fringe_percentage", { precision: 6, scale: 2 }).notNull().default("0"),
  overheadPercentage: numeric("overhead_percentage", { precision: 6, scale: 2 }).notNull().default("0"),
  gaPercentage: numeric("ga_percentage", { precision: 6, scale: 2 }).notNull().default("0"),
  effectiveStartDate: timestamp("effective_start_date").notNull(),
  effectiveEndDate: timestamp("effective_end_date"),
  isActive: integer("is_active").notNull().default(1),
  notes: text("notes"),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("labor_burden_rates_org_start_idx").on(table.organizationId, table.effectiveStartDate),
]);

export const insertLaborBurdenRateSchema = createInsertSchema(laborBurdenRates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  fringePercentage: z.string().or(z.number()).transform(val => String(val)),
  overheadPercentage: z.string().or(z.number()).transform(val => String(val)),
  gaPercentage: z.string().or(z.number()).transform(val => String(val)),
  effectiveStartDate: z.coerce.date(),
  effectiveEndDate: z.coerce.date().optional(),
});

export type InsertLaborBurdenRate = z.infer<typeof insertLaborBurdenRateSchema>;
export type LaborBurdenRate = typeof laborBurdenRates.$inferSelect;

// Billing Rates table (separate from cost rates)
export const billingRates = pgTable("billing_rates", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  rateName: varchar("rate_name", { length: 255 }).notNull(),
  subjectType: varchar("subject_type", { length: 50 }).notNull(),
  subjectId: integer("subject_id"),
  contractId: integer("contract_id").references(() => contracts.id),
  projectId: integer("project_id").references(() => projects.id),
  hourlyRate: numeric("hourly_rate", { precision: 10, scale: 2 }),
  dailyRate: numeric("daily_rate", { precision: 10, scale: 2 }),
  billingMethod: billingMethodEnum("billing_method").notNull().default('hourly'),
  effectiveStartDate: timestamp("effective_start_date").notNull(),
  effectiveEndDate: timestamp("effective_end_date"),
  isActive: integer("is_active").notNull().default(1),
  notes: text("notes"),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("billing_rates_org_start_idx").on(table.organizationId, table.effectiveStartDate),
]);

export const insertBillingRateSchema = createInsertSchema(billingRates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  hourlyRate: z.string().or(z.number()).transform(val => String(val)).optional(),
  dailyRate: z.string().or(z.number()).transform(val => String(val)).optional(),
  effectiveStartDate: z.coerce.date(),
  effectiveEndDate: z.coerce.date().optional(),
});

export type InsertBillingRate = z.infer<typeof insertBillingRateSchema>;
export type BillingRate = typeof billingRates.$inferSelect;

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
  isBillable: integer("is_billable").notNull().default(1),
  isReimbursable: integer("is_reimbursable").notNull().default(0),
  laborBurdenRateId: integer("labor_burden_rate_id").references(() => laborBurdenRates.id),
  billingRateId: integer("billing_rate_id").references(() => billingRates.id),
  postingSource: varchar("posting_source", { length: 100 }),
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
  quantity: z.string().or(z.number()).nullable().optional().transform(val => val === '' || val === null || val === undefined ? null : String(val)),
  unitCost: z.string().or(z.number()).nullable().optional().transform(val => val === '' || val === null || val === undefined ? null : String(val)),
  costDate: z.coerce.date(),
});

export type InsertProjectCost = z.infer<typeof insertProjectCostSchema>;
export type ProjectCost = typeof projectCosts.$inferSelect;

// Project Budget Breakdowns table (for detailed budget planning)
export const projectBudgetBreakdowns = pgTable("project_budget_breakdowns", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  projectId: integer("project_id").notNull().references(() => projects.id),
  costType: costTypeEnum("cost_type").notNull(),
  budgetedAmount: numeric("budgeted_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  description: text("description"),
  notes: text("notes"),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("project_budget_breakdowns_project_idx").on(table.projectId),
]);

export const insertProjectBudgetBreakdownSchema = createInsertSchema(projectBudgetBreakdowns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  budgetedAmount: z.string().or(z.number()).transform(val => String(val)),
});

export type InsertProjectBudgetBreakdown = z.infer<typeof insertProjectBudgetBreakdownSchema>;
export type ProjectBudgetBreakdown = typeof projectBudgetBreakdowns.$inferSelect;

// Project Revenue Ledger table (for revenue recognition tracking)
export const projectRevenueLedger = pgTable("project_revenue_ledger", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  projectId: integer("project_id").notNull().references(() => projects.id),
  contractId: integer("contract_id").references(() => contracts.id),
  invoiceId: integer("invoice_id").references(() => invoices.id),
  revenueDate: timestamp("revenue_date").notNull(),
  revenueStatus: revenueStatusEnum("revenue_status").notNull().default('unbilled'),
  recognitionMethod: revenueRecognitionMethodEnum("recognition_method").notNull().default('time_and_materials'),
  billedAmount: numeric("billed_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  recognizedAmount: numeric("recognized_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  deferredAmount: numeric("deferred_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  description: text("description"),
  notes: text("notes"),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("project_revenue_ledger_project_idx").on(table.projectId),
]);

export const insertProjectRevenueLedgerSchema = createInsertSchema(projectRevenueLedger).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  revenueDate: z.coerce.date(),
  billedAmount: z.string().or(z.number()).transform(val => String(val)),
  recognizedAmount: z.string().or(z.number()).transform(val => String(val)),
  deferredAmount: z.string().or(z.number()).transform(val => String(val)),
});

export type InsertProjectRevenueLedger = z.infer<typeof insertProjectRevenueLedgerSchema>;
export type ProjectRevenueLedger = typeof projectRevenueLedger.$inferSelect;

// Project Financial Snapshots table (materialized view for quick reporting)
export const projectFinancialSnapshots = pgTable("project_financial_snapshots", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  projectId: integer("project_id").notNull().references(() => projects.id),
  snapshotDate: timestamp("snapshot_date").notNull(),
  totalBudget: numeric("total_budget", { precision: 15, scale: 2 }).notNull().default("0"),
  totalActualCost: numeric("total_actual_cost", { precision: 15, scale: 2 }).notNull().default("0"),
  totalLaborCost: numeric("total_labor_cost", { precision: 15, scale: 2 }).notNull().default("0"),
  totalMaterialsCost: numeric("total_materials_cost", { precision: 15, scale: 2 }).notNull().default("0"),
  totalOverheadCost: numeric("total_overhead_cost", { precision: 15, scale: 2 }).notNull().default("0"),
  totalBillableAmount: numeric("total_billable_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  totalBilledAmount: numeric("total_billed_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  totalRecognizedRevenue: numeric("total_recognized_revenue", { precision: 15, scale: 2 }).notNull().default("0"),
  budgetVariance: numeric("budget_variance", { precision: 15, scale: 2 }).notNull().default("0"),
  budgetVariancePercent: numeric("budget_variance_percent", { precision: 6, scale: 2 }).notNull().default("0"),
  profitMargin: numeric("profit_margin", { precision: 15, scale: 2 }).notNull().default("0"),
  profitMarginPercent: numeric("profit_margin_percent", { precision: 6, scale: 2 }).notNull().default("0"),
  burnRate: numeric("burn_rate", { precision: 15, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("project_financial_snapshots_project_idx").on(table.projectId),
]);

export const insertProjectFinancialSnapshotSchema = createInsertSchema(projectFinancialSnapshots).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  snapshotDate: z.coerce.date(),
  totalBudget: z.string().or(z.number()).transform(val => String(val)),
  totalActualCost: z.string().or(z.number()).transform(val => String(val)),
  totalLaborCost: z.string().or(z.number()).transform(val => String(val)),
  totalMaterialsCost: z.string().or(z.number()).transform(val => String(val)),
  totalOverheadCost: z.string().or(z.number()).transform(val => String(val)),
  totalBillableAmount: z.string().or(z.number()).transform(val => String(val)),
  totalBilledAmount: z.string().or(z.number()).transform(val => String(val)),
  totalRecognizedRevenue: z.string().or(z.number()).transform(val => String(val)),
  budgetVariance: z.string().or(z.number()).transform(val => String(val)),
  budgetVariancePercent: z.string().or(z.number()).transform(val => String(val)),
  profitMargin: z.string().or(z.number()).transform(val => String(val)),
  profitMarginPercent: z.string().or(z.number()).transform(val => String(val)),
  burnRate: z.string().or(z.number()).transform(val => String(val)),
});

export type InsertProjectFinancialSnapshot = z.infer<typeof insertProjectFinancialSnapshotSchema>;
export type ProjectFinancialSnapshot = typeof projectFinancialSnapshots.$inferSelect;

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
// DONOR PORTAL ACCESS TOKENS (Magic Link Auth)
// ============================================

export const donorAccessTokens = pgTable("donor_access_tokens", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  donorId: integer("donor_id").notNull().references(() => donors.id, { onDelete: 'cascade' }),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_donor_access_tokens_token").on(table.token),
  index("idx_donor_access_tokens_donor_id").on(table.donorId),
]);

export const insertDonorAccessTokenSchema = createInsertSchema(donorAccessTokens).omit({
  id: true,
  createdAt: true,
});

export type InsertDonorAccessToken = z.infer<typeof insertDonorAccessTokenSchema>;
export type DonorAccessToken = typeof donorAccessTokens.$inferSelect;

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
  statementStartDate: timestamp("statement_start_date"),
  statementEndDate: timestamp("statement_end_date").notNull(),
  beginningBalance: numeric("beginning_balance", { precision: 15, scale: 2 }).notNull(),
  endingBalance: numeric("ending_balance", { precision: 15, scale: 2 }).notNull(),
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
  statementDate: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  statementStartDate: z.coerce.date().optional().nullable(),
  statementEndDate: z.coerce.date(),
  beginningBalance: z.string().or(z.number()).transform(val => String(val)),
  endingBalance: z.string().or(z.number()).transform(val => String(val)),
  statementBalance: z.string().or(z.number()).transform(val => String(val)),
  bookBalance: z.string().or(z.number()).transform(val => String(val)),
  difference: z.string().or(z.number()).transform(val => String(val)),
  reconciledDate: z.coerce.date().optional().nullable(),
  status: z.enum(['unreconciled', 'reconciled', 'pending']).default('pending'),
});

export type InsertBankReconciliation = z.infer<typeof insertBankReconciliationSchema>;
export type BankReconciliation = typeof bankReconciliations.$inferSelect;

export const bankStatementEntries = pgTable("bank_statement_entries", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  reconciliationId: integer("reconciliation_id").notNull().references(() => bankReconciliations.id, { onDelete: 'cascade' }),
  date: timestamp("date").notNull(),
  description: text("description").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  type: transactionTypeEnum("type").notNull(),
  isMatched: integer("is_matched").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_bank_statement_entries_recon_id").on(table.reconciliationId),
  index("idx_bank_statement_entries_recon_matched").on(table.reconciliationId, table.isMatched),
]);

export const insertBankStatementEntrySchema = createInsertSchema(bankStatementEntries).omit({
  id: true,
  createdAt: true,
}).extend({
  date: z.coerce.date(),
  amount: z.string().or(z.number()).transform(val => String(val)),
  type: z.enum(['income', 'expense']),
  isMatched: z.number().default(0),
});

export type InsertBankStatementEntry = z.infer<typeof insertBankStatementEntrySchema>;
export type BankStatementEntry = typeof bankStatementEntries.$inferSelect;

export const reconciliationMatches = pgTable("reconciliation_matches", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  reconciliationId: integer("reconciliation_id").notNull().references(() => bankReconciliations.id, { onDelete: 'cascade' }),
  transactionId: integer("transaction_id").references(() => transactions.id, { onDelete: 'set null' }),
  statementEntryId: integer("statement_entry_id").references(() => bankStatementEntries.id, { onDelete: 'cascade' }),
  matchedBy: varchar("matched_by").references(() => users.id, { onDelete: 'set null' }),
  matchedAt: timestamp("matched_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_reconciliation_matches_recon_id").on(table.reconciliationId),
  index("idx_reconciliation_matches_transaction_id").on(table.transactionId),
  index("idx_reconciliation_matches_statement_entry_id").on(table.statementEntryId),
  index("idx_reconciliation_matches_recon_matched_at").on(table.reconciliationId, table.matchedAt),
]);

export const insertReconciliationMatchSchema = createInsertSchema(reconciliationMatches).omit({
  id: true,
  createdAt: true,
}).extend({
  matchedAt: z.coerce.date().optional().nullable(),
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
// BILL PAYMENT AUTOMATION
// ============================================

// Auto-pay rules for automated bill payment
export const autoPayRules = pgTable("auto_pay_rules", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: varchar("name", { length: 255 }).notNull(),
  ruleType: autoPayRuleTypeEnum("rule_type").notNull(),
  status: autoPayStatusEnum("status").notNull().default('active'),
  
  // Vendor-based rule
  vendorId: integer("vendor_id").references(() => vendors.id, { onDelete: 'cascade' }),
  
  // Amount threshold rules
  minAmount: numeric("min_amount", { precision: 12, scale: 2 }),
  maxAmount: numeric("max_amount", { precision: 12, scale: 2 }),
  
  // Due date rules (e.g., pay X days before due)
  daysBeforeDue: integer("days_before_due").default(0),
  
  // Payment settings
  paymentMethod: paymentMethodEnum("payment_method").notNull().default('manual'),
  requiresApproval: boolean("requires_approval").default(true).notNull(),
  
  // Notification settings
  notifyOnPayment: boolean("notify_on_payment").default(true).notNull(),
  notifyDaysBeforePayment: integer("notify_days_before_payment").default(1),
  
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_auto_pay_rules_org_id").on(table.organizationId),
  index("idx_auto_pay_rules_vendor_id").on(table.vendorId),
  index("idx_auto_pay_rules_status").on(table.status),
]);

export const insertAutoPayRuleSchema = createInsertSchema(autoPayRules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  minAmount: z.string().or(z.number()).transform(val => String(val)).optional().nullable(),
  maxAmount: z.string().or(z.number()).transform(val => String(val)).optional().nullable(),
  ruleType: z.enum(['vendor', 'amount_threshold', 'due_date', 'combined']),
  status: z.enum(['active', 'paused', 'disabled']).default('active'),
  paymentMethod: z.enum(['ach', 'card', 'check', 'manual']).default('manual'),
});

export type InsertAutoPayRule = z.infer<typeof insertAutoPayRuleSchema>;
export type AutoPayRule = typeof autoPayRules.$inferSelect;

// Scheduled payments for specific bills
export const scheduledPayments = pgTable("scheduled_payments", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  billId: integer("bill_id").notNull().references(() => bills.id, { onDelete: 'cascade' }),
  autoPayRuleId: integer("auto_pay_rule_id").references(() => autoPayRules.id, { onDelete: 'set null' }),
  
  scheduledDate: timestamp("scheduled_date").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  paymentMethod: paymentMethodEnum("payment_method").notNull().default('manual'),
  status: scheduledPaymentStatusEnum("status").notNull().default('pending'),
  
  // Reminder settings
  reminderSent: boolean("reminder_sent").default(false).notNull(),
  reminderSentAt: timestamp("reminder_sent_at"),
  
  // Processing details
  processedAt: timestamp("processed_at"),
  failureReason: text("failure_reason"),
  stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 }),
  
  notes: text("notes"),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_scheduled_payments_org_id").on(table.organizationId),
  index("idx_scheduled_payments_bill_id").on(table.billId),
  index("idx_scheduled_payments_scheduled_date").on(table.scheduledDate),
  index("idx_scheduled_payments_status").on(table.status),
]);

export const insertScheduledPaymentSchema = createInsertSchema(scheduledPayments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  organizationId: z.number(),
  billId: z.number(),
  autoPayRuleId: z.number().optional().nullable(),
  scheduledDate: z.coerce.date(),
  amount: z.string().or(z.number()).transform(val => String(val)),
  paymentMethod: z.enum(['ach', 'card', 'check', 'manual']).default('manual'),
  status: z.enum(['pending', 'processing', 'completed', 'failed', 'cancelled']).default('pending'),
  reminderSent: z.boolean().default(false),
  reminderSentAt: z.coerce.date().optional().nullable(),
  processedAt: z.coerce.date().optional().nullable(),
  failureReason: z.string().optional().nullable(),
  stripePaymentIntentId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  createdBy: z.string(),
});

export type InsertScheduledPayment = z.infer<typeof insertScheduledPaymentSchema>;
export type ScheduledPayment = typeof scheduledPayments.$inferSelect;

// Payment history records
export const billPayments = pgTable("bill_payments", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  billId: integer("bill_id").notNull().references(() => bills.id, { onDelete: 'cascade' }),
  scheduledPaymentId: integer("scheduled_payment_id").references(() => scheduledPayments.id, { onDelete: 'set null' }),
  
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  paymentDate: timestamp("payment_date").notNull(),
  paymentMethod: paymentMethodEnum("payment_method").notNull(),
  
  // Stripe integration
  stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 }),
  stripeChargeId: varchar("stripe_charge_id", { length: 255 }),
  
  // Check details (if applicable)
  checkNumber: varchar("check_number", { length: 50 }),
  
  // ACH details (if applicable)
  achTransactionId: varchar("ach_transaction_id", { length: 255 }),
  
  // Reference/confirmation
  referenceNumber: varchar("reference_number", { length: 100 }),
  notes: text("notes"),
  
  // Linked transaction (expense record)
  transactionId: integer("transaction_id").references(() => transactions.id, { onDelete: 'set null' }),
  
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_bill_payments_org_id").on(table.organizationId),
  index("idx_bill_payments_bill_id").on(table.billId),
  index("idx_bill_payments_payment_date").on(table.paymentDate),
]);

export const insertBillPaymentSchema = createInsertSchema(billPayments).omit({
  id: true,
  createdAt: true,
}).extend({
  organizationId: z.number(),
  billId: z.number(),
  scheduledPaymentId: z.number().optional().nullable(),
  amount: z.string().or(z.number()).transform(val => String(val)),
  paymentDate: z.coerce.date(),
  paymentMethod: z.enum(['ach', 'card', 'check', 'manual']),
  stripePaymentIntentId: z.string().optional().nullable(),
  stripeChargeId: z.string().optional().nullable(),
  checkNumber: z.string().optional().nullable(),
  achTransactionId: z.string().optional().nullable(),
  referenceNumber: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  transactionId: z.number().optional().nullable(),
  createdBy: z.string(),
});

export type InsertBillPayment = z.infer<typeof insertBillPaymentSchema>;
export type BillPayment = typeof billPayments.$inferSelect;

// Vendor payment details (bank info for ACH, etc.)
export const vendorPaymentDetails = pgTable("vendor_payment_details", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  vendorId: integer("vendor_id").notNull().references(() => vendors.id, { onDelete: 'cascade' }),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  
  // Preferred payment method
  preferredPaymentMethod: paymentMethodEnum("preferred_payment_method").notNull().default('manual'),
  
  // Bank details for ACH (encrypted)
  bankNameEncrypted: text("bank_name_encrypted"),
  accountNumberEncrypted: text("account_number_encrypted"),
  routingNumberEncrypted: text("routing_number_encrypted"),
  accountType: varchar("account_type", { length: 20 }), // 'checking' or 'savings'
  
  // Address for checks
  payableTo: varchar("payable_to", { length: 255 }),
  mailingAddress: text("mailing_address"),
  
  // Stripe Connect (if using Stripe for payouts)
  stripeConnectedAccountId: varchar("stripe_connected_account_id", { length: 255 }),
  
  isVerified: boolean("is_verified").default(false).notNull(),
  verifiedAt: timestamp("verified_at"),
  
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_vendor_payment_details_vendor_id").on(table.vendorId),
  index("idx_vendor_payment_details_org_id").on(table.organizationId),
]);

export const insertVendorPaymentDetailsSchema = createInsertSchema(vendorPaymentDetails).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  preferredPaymentMethod: z.enum(['ach', 'card', 'check', 'manual']).default('manual'),
});

export type InsertVendorPaymentDetails = z.infer<typeof insertVendorPaymentDetailsSchema>;
export type VendorPaymentDetails = typeof vendorPaymentDetails.$inferSelect;

// ============================================
// FINCH PAYROLL/HRIS INTEGRATION
// ============================================

export const finchConnectionStatusEnum = pgEnum('finch_connection_status', ['active', 'disconnected', 'pending_reauth', 'error']);

export const finchConnections = pgTable("finch_connections", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  connectionId: varchar("connection_id", { length: 255 }).notNull().unique(),
  companyId: varchar("company_id", { length: 255 }),
  providerId: varchar("provider_id", { length: 100 }),
  providerName: varchar("provider_name", { length: 255 }),
  accessToken: text("access_token").notNull(),
  products: text("products").array(),
  status: finchConnectionStatusEnum("status").default("active").notNull(),
  errorMessage: text("error_message"),
  lastSyncedAt: timestamp("last_synced_at"),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_finch_connections_org_id").on(table.organizationId),
]);

export const insertFinchConnectionSchema = createInsertSchema(finchConnections).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertFinchConnection = z.infer<typeof insertFinchConnectionSchema>;
export type FinchConnection = typeof finchConnections.$inferSelect;

// ============================================
// SURVEYS & FORMS
// ============================================

export const formTypeEnum = pgEnum('form_type', ['survey', 'form']);
export const formCategoryEnum = pgEnum('form_category', ['fundraising', 'registration', 'event', 'volunteer', 'feedback', 'other']);
export const questionTypeEnum = pgEnum('question_type', [
  'short_text',
  'long_text',
  'single_choice',
  'multiple_choice',
  'dropdown',
  'rating',
  'date',
  'email',
  'phone',
  'number',
  'file_upload'
]);
export const formStatusEnum = pgEnum('form_status', ['draft', 'active', 'closed']);

export const forms = pgTable("forms", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  formType: formTypeEnum("form_type").notNull(),
  category: formCategoryEnum("category").default('other'),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  status: formStatusEnum("status").default('draft').notNull(),
  publicId: varchar("public_id", { length: 64 }).notNull().unique(),
  settings: jsonb("settings").$type<{
    collectEmail?: boolean;
    collectName?: boolean;
    confirmationMessage?: string;
    redirectUrl?: string;
    allowMultiple?: boolean;
    showProgressBar?: boolean;
    allowAnonymous?: boolean;
    shuffleQuestions?: boolean;
    notifyOnSubmission?: boolean;
    notificationEmail?: string;
    requireConsent?: boolean;
    consentText?: string;
    autoThankYou?: boolean;
    thankYouEmailSubject?: string;
    thankYouEmailBody?: string;
    isTemplate?: boolean;
    templateCategory?: string;
    enableDonorPrefill?: boolean;
    embedEnabled?: boolean;
  }>().default({}),
  paymentSettings: jsonb("payment_settings").$type<{
    enablePayments?: boolean;
    paymentRequired?: boolean;
    suggestedAmounts?: number[];
    customAmountEnabled?: boolean;
    minimumAmount?: number;
    maximumAmount?: number;
    paymentDescription?: string;
    stripeEnabled?: boolean;
    venmoEnabled?: boolean;
    paypalEnabled?: boolean;
    cashappEnabled?: boolean;
  }>().default({}),
  contentBlocks: jsonb("content_blocks").$type<Array<{
    id: string;
    type: 'text' | 'image' | 'divider' | 'heading' | 'spacer';
    content?: string;
    imageUrl?: string;
    alignment?: 'left' | 'center' | 'right';
    size?: 'small' | 'medium' | 'large';
    orderIndex: number;
  }>>().default([]),
  branding: jsonb("branding").$type<{
    useBranding?: boolean;
    primaryColor?: string;
    accentColor?: string;
    fontFamily?: string;
    logoUrl?: string;
    headerImage?: string;
    bannerImage?: string;
    theme?: string;
    customCss?: string;
  }>().default({ useBranding: true }),
  responseCount: integer("response_count").default(0).notNull(),
  createdBy: varchar("created_by", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  closedAt: timestamp("closed_at"),
});

export const insertFormSchema = createInsertSchema(forms).omit({ 
  id: true, 
  responseCount: true,
  createdAt: true, 
  updatedAt: true,
  closedAt: true 
});
export type InsertForm = z.infer<typeof insertFormSchema>;
export type Form = typeof forms.$inferSelect;

export const formQuestions = pgTable("form_questions", {
  id: serial("id").primaryKey(),
  formId: integer("form_id").references(() => forms.id, { onDelete: 'cascade' }).notNull(),
  questionType: questionTypeEnum("question_type").notNull(),
  question: text("question").notNull(),
  description: text("description"),
  required: boolean("required").default(false).notNull(),
  options: jsonb("options").$type<string[]>(),
  settings: jsonb("settings").$type<{
    minValue?: number;
    maxValue?: number;
    placeholder?: string;
    allowedFileTypes?: string[];
    maxFileSize?: number;
    ratingMax?: number;
    ratingLabels?: { min?: string; max?: string };
  }>().default({}),
  orderIndex: integer("order_index").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertFormQuestionSchema = createInsertSchema(formQuestions).omit({ 
  id: true, 
  createdAt: true 
});
export type InsertFormQuestion = z.infer<typeof insertFormQuestionSchema>;
export type FormQuestion = typeof formQuestions.$inferSelect;

export const formResponses = pgTable("form_responses", {
  id: serial("id").primaryKey(),
  formId: integer("form_id").references(() => forms.id, { onDelete: 'cascade' }).notNull(),
  respondentEmail: varchar("respondent_email", { length: 255 }),
  respondentName: varchar("respondent_name", { length: 255 }),
  donorId: integer("donor_id").references(() => donors.id, { onDelete: 'set null' }),
  programId: integer("program_id").references(() => programs.id, { onDelete: 'set null' }),
  answers: jsonb("answers").$type<Record<number, any>>().notNull(),
  metadata: jsonb("metadata").$type<{
    userAgent?: string;
    ipAddress?: string;
    referrer?: string;
    consentGiven?: boolean;
    consentTimestamp?: string;
    tags?: string[];
  }>(),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
});

export const insertFormResponseSchema = createInsertSchema(formResponses).omit({ 
  id: true, 
  submittedAt: true 
});
export type InsertFormResponse = z.infer<typeof insertFormResponseSchema>;
export type FormResponse = typeof formResponses.$inferSelect;

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
