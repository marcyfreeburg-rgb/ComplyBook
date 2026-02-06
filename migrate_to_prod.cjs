const { Pool: NeonPool, neonConfig } = require('@neondatabase/serverless');
const ws = require('ws');
neonConfig.webSocketConstructor = ws;

let devUrl = process.env.NEON_PRODUCTION_DATABASE_URL;
if (devUrl && devUrl.includes('-pooler')) devUrl = devUrl.replace('-pooler', '');
const devPool = new NeonPool({ connectionString: devUrl });

let prodUrl = process.env.RENDER_PRODUCTION_DATABASE_URL;
if (prodUrl && prodUrl.includes('-pooler')) prodUrl = prodUrl.replace('-pooler', '');
const prodPool = new NeonPool({ connectionString: prodUrl });

// Tables in dependency order (parents first)
const migrationOrder = [
  // Independent tables / parent tables
  'vendors',
  'clients', 
  'donors',
  'funds',
  'programs',
  'teams',
  'employees',
  'contracts',
  'projects',
  'subcontractors',
  'plaid_items',
  'forms',
  
  // Second level (depend on above)
  'grants',
  'budgets',
  'invoices',
  'bills',
  'transactions',
  'recurring_transactions',
  'bank_reconciliations',
  'pledges',
  'fundraising_campaigns',
  'donor_letters',
  'donor_access_tokens',
  'donor_tiers',
  'proposals',
  'contract_milestones',
  'plaid_accounts',
  'deductions',
  'payroll_runs',
  'compliance_events',
  'custom_reports',
  'tax_reports',
  'audit_prep_items',
  'form_questions',
  'mileage_rates',
  'per_diem_rates',
  'dismissed_patterns',
  
  // Third level (depend on second level)
  'invoice_line_items',
  'bill_line_items',
  'bill_payments',
  'bank_statement_entries',
  'categorization_history',
  'reconciliation_matches',
  'reconciliation_alerts',
  'reconciliation_audit_logs',
  'pledge_payments',
  'in_kind_donations',
  'campaign_donations',
  'expense_approvals',
  'documents',
  'change_orders',
  'sub_awards',
  'subcontractor_payments',
  'time_entries',
  'project_costs',
  'time_effort_reports',
  'payroll_items',
  'paystubs',
  'payroll_item_deductions',
  'form_responses',
  'tax_form_1099s',
  'scheduled_payments',
  'budget_items',
  'budget_income_items',
  'budget_alerts',
  'transaction_attachments',
  'mileage_expenses',
  'per_diem_expenses',
  'project_budget_breakdowns',
  'project_financial_snapshots',
  'project_revenue_ledger',
];

async function migrateTable(tableName) {
  try {
    // Check if dev has data
    const devCount = await devPool.query(`SELECT COUNT(*) FROM ${tableName}`);
    const count = parseInt(devCount.rows[0].count);
    if (count === 0) return { table: tableName, status: 'skip', count: 0 };
    
    // Check if prod already has data
    const prodCount = await prodPool.query(`SELECT COUNT(*) FROM ${tableName}`);
    if (parseInt(prodCount.rows[0].count) > 0) {
      return { table: tableName, status: 'exists', count: parseInt(prodCount.rows[0].count) };
    }
    
    // Get column info for this table from dev
    const colInfo = await devPool.query(
      `SELECT column_name, data_type, is_identity, identity_generation
       FROM information_schema.columns 
       WHERE table_name = $1 AND table_schema = 'public'
       ORDER BY ordinal_position`, [tableName]
    );
    
    const columns = colInfo.rows.map(r => r.column_name);
    const hasIdentity = colInfo.rows.some(r => r.is_identity === 'YES' || r.identity_generation);
    const columnList = columns.map(c => `"${c}"`).join(', ');
    
    // Fetch all data from dev in batches
    const batchSize = 500;
    let offset = 0;
    let totalInserted = 0;
    
    while (offset < count) {
      const rows = await devPool.query(
        `SELECT * FROM ${tableName} ORDER BY 1 LIMIT ${batchSize} OFFSET ${offset}`
      );
      
      if (rows.rows.length === 0) break;
      
      // Build insert values
      for (const row of rows.rows) {
        const values = columns.map(col => {
          const val = row[col];
          if (val === null || val === undefined) return 'NULL';
          if (val instanceof Date) return `'${val.toISOString()}'`;
          if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
          if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
          if (typeof val === 'number') return val.toString();
          return `'${String(val).replace(/'/g, "''")}'`;
        });
        
        const insertSQL = hasIdentity 
          ? `INSERT INTO ${tableName} (${columnList}) OVERRIDING SYSTEM VALUE VALUES (${values.join(', ')}) ON CONFLICT DO NOTHING`
          : `INSERT INTO ${tableName} (${columnList}) VALUES (${values.join(', ')}) ON CONFLICT DO NOTHING`;
        
        try {
          await prodPool.query(insertSQL);
          totalInserted++;
        } catch(e) {
          if (!e.message.includes('duplicate key') && !e.message.includes('already exists')) {
            console.error(`  Error inserting into ${tableName}: ${e.message.substring(0, 120)}`);
          }
        }
      }
      
      offset += batchSize;
    }
    
    // Reset sequence if table has identity column
    if (hasIdentity) {
      try {
        await prodPool.query(`SELECT setval(pg_get_serial_sequence('${tableName}', 'id'), (SELECT COALESCE(MAX(id), 1) FROM ${tableName}))`);
      } catch(e) {
        // sequence might not exist for this table
      }
    }
    
    return { table: tableName, status: 'migrated', count: totalInserted };
  } catch(e) {
    return { table: tableName, status: 'error', error: e.message.substring(0, 150) };
  }
}

async function main() {
  console.log('Starting migration from dev Neon → production Neon');
  console.log('=' .repeat(60));
  
  let totalMigrated = 0;
  let errors = [];
  
  for (const table of migrationOrder) {
    const result = await migrateTable(table);
    if (result.status === 'migrated') {
      console.log(`✓ ${result.table}: ${result.count} rows migrated`);
      totalMigrated += result.count;
    } else if (result.status === 'exists') {
      console.log(`~ ${result.table}: already has ${result.count} rows`);
    } else if (result.status === 'error') {
      console.log(`✗ ${result.table}: ERROR - ${result.error}`);
      errors.push(result);
    }
    // skip tables with 0 rows silently
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log(`Migration complete. Total rows migrated: ${totalMigrated}`);
  if (errors.length > 0) {
    console.log(`Errors: ${errors.length}`);
    errors.forEach(e => console.log(`  ${e.table}: ${e.error}`));
  }
  
  devPool.end();
  prodPool.end();
}

main();
