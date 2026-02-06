const { Pool: NeonPool, neonConfig } = require('@neondatabase/serverless');
const ws = require('ws');
neonConfig.webSocketConstructor = ws;

let devUrl = process.env.NEON_PRODUCTION_DATABASE_URL;
if (devUrl && devUrl.includes('-pooler')) devUrl = devUrl.replace('-pooler', '');
const devPool = new NeonPool({ connectionString: devUrl });

let prodUrl = process.env.RENDER_PRODUCTION_DATABASE_URL;
if (prodUrl && prodUrl.includes('-pooler')) prodUrl = prodUrl.replace('-pooler', '');
const prodPool = new NeonPool({ connectionString: prodUrl });

async function getColumnInfo(pool, tableName) {
  const res = await pool.query(
    `SELECT column_name, data_type, udt_name, is_identity, identity_generation
     FROM information_schema.columns 
     WHERE table_name = $1 AND table_schema = 'public'
     ORDER BY ordinal_position`, [tableName]
  );
  return res.rows;
}

function formatValue(val, colType) {
  if (val === null || val === undefined) return 'NULL';
  
  // Handle array types
  if (colType.data_type === 'ARRAY' || colType.udt_name.startsWith('_')) {
    if (Array.isArray(val) && val.length > 0) {
      const baseType = colType.udt_name.replace(/^_/, '');
      const elements = val.map(v => "'" + String(v).replace(/'/g, "''") + "'").join(',');
      return `ARRAY[${elements}]::${baseType}[]`;
    }
    const baseType = colType.udt_name.replace(/^_/, '');
    return `ARRAY[]::${baseType}[]`;
  }
  
  if (val instanceof Date) return "'" + val.toISOString() + "'";
  
  // Handle jsonb/json
  if (colType.data_type === 'jsonb' || colType.data_type === 'json' || colType.udt_name === 'jsonb' || colType.udt_name === 'json') {
    if (typeof val === 'object') return "'" + JSON.stringify(val).replace(/'/g, "''") + "'::jsonb";
    return "'" + String(val).replace(/'/g, "''") + "'::jsonb";
  }
  
  if (typeof val === 'object' && !(val instanceof Date)) {
    return "'" + JSON.stringify(val).replace(/'/g, "''") + "'::jsonb";
  }
  
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (typeof val === 'number') return val.toString();
  return "'" + String(val).replace(/'/g, "''") + "'";
}

async function migrateTable(tableName) {
  try {
    const devCount = await devPool.query(`SELECT COUNT(*) FROM ${tableName}`);
    const count = parseInt(devCount.rows[0].count);
    if (count === 0) return { table: tableName, status: 'skip', count: 0 };
    
    const prodCount = await prodPool.query(`SELECT COUNT(*) FROM ${tableName}`);
    if (parseInt(prodCount.rows[0].count) > 0) {
      return { table: tableName, status: 'exists', count: parseInt(prodCount.rows[0].count) };
    }
    
    const colInfoRows = await getColumnInfo(prodPool, tableName);
    const columns = colInfoRows.map(r => r.column_name);
    const columnTypes = {};
    colInfoRows.forEach(r => { columnTypes[r.column_name] = { data_type: r.data_type, udt_name: r.udt_name }; });
    const hasIdentity = colInfoRows.some(r => r.is_identity === 'YES' || r.identity_generation);
    const columnList = columns.map(c => `"${c}"`).join(', ');
    
    const batchSize = 500;
    let offset = 0;
    let totalInserted = 0;
    let errors = 0;
    
    while (offset < count) {
      const rows = await devPool.query(`SELECT * FROM ${tableName} ORDER BY 1 LIMIT ${batchSize} OFFSET ${offset}`);
      if (rows.rows.length === 0) break;
      
      for (const row of rows.rows) {
        const values = columns.map(col => formatValue(row[col], columnTypes[col]));
        
        const sql = hasIdentity
          ? `INSERT INTO ${tableName} (${columnList}) OVERRIDING SYSTEM VALUE VALUES (${values.join(', ')}) ON CONFLICT DO NOTHING`
          : `INSERT INTO ${tableName} (${columnList}) VALUES (${values.join(', ')}) ON CONFLICT DO NOTHING`;
        
        try {
          await prodPool.query(sql);
          totalInserted++;
        } catch(e) {
          if (!e.message.includes('duplicate key')) {
            if (errors < 3) console.error(`  Error in ${tableName}: ${e.message.substring(0, 150)}`);
            errors++;
          }
        }
      }
      offset += batchSize;
      if (offset % 1000 === 0 && count > 1000) process.stdout.write(`  ${tableName}: ${offset}/${count}...\n`);
    }
    
    // Reset sequence
    if (hasIdentity) {
      try {
        await prodPool.query(`SELECT setval(pg_get_serial_sequence('${tableName}', 'id'), (SELECT COALESCE(MAX(id), 1) FROM ${tableName}))`);
      } catch(e) {}
    }
    
    if (errors > 0) {
      return { table: tableName, status: 'partial', count: totalInserted, errors };
    }
    return { table: tableName, status: 'migrated', count: totalInserted };
  } catch(e) {
    return { table: tableName, status: 'error', error: e.message.substring(0, 150) };
  }
}

async function main() {
  // Tables that still need migration (plaid_accounts already done, parent tables already done)
  const remaining = [
    // These should already be done but check again
    'vendors', 'clients', 'donors', 'funds', 'programs', 'teams', 'employees',
    'contracts', 'projects', 'plaid_items', 'forms', 'grants', 'budgets', 
    'invoices', 'bills', 'plaid_accounts',
    
    // Now do the ones that failed before
    'transactions',
    'recurring_transactions',
    'bank_reconciliations',
    'pledges', 'fundraising_campaigns', 'donor_letters', 'donor_access_tokens',
    'proposals', 'contract_milestones',
    'deductions', 'payroll_runs', 'compliance_events',
    'custom_reports', 'tax_reports', 'audit_prep_items',
    'form_questions', 'dismissed_patterns', 'scheduled_payments',
    
    // Depend on above
    'invoice_line_items', 'bill_line_items', 'bill_payments',
    'bank_statement_entries', 'categorization_history',
    'reconciliation_matches',
    'in_kind_donations',
    'expense_approvals', 'documents',
    'change_orders',
    'time_entries', 'project_costs',
    'payroll_items', 'paystubs',
    'form_responses', 'tax_form_1099s',
    'budget_items', 'budget_income_items',
    'transaction_attachments',
  ];
  
  console.log('Continuing migration to production Neon...');
  console.log('='.repeat(60));
  
  let totalMigrated = 0;
  let errorTables = [];
  
  for (const table of remaining) {
    const result = await migrateTable(table);
    if (result.status === 'migrated') {
      console.log(`✓ ${result.table}: ${result.count} rows`);
      totalMigrated += result.count;
    } else if (result.status === 'partial') {
      console.log(`~ ${result.table}: ${result.count} rows (${result.errors} errors)`);
      totalMigrated += result.count;
      errorTables.push(result);
    } else if (result.status === 'exists') {
      console.log(`= ${result.table}: already has ${result.count} rows`);
    } else if (result.status === 'error') {
      console.log(`✗ ${result.table}: ${result.error}`);
      errorTables.push(result);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`Total rows migrated: ${totalMigrated}`);
  if (errorTables.length > 0) {
    console.log(`Tables with issues: ${errorTables.length}`);
  }
  
  devPool.end();
  prodPool.end();
}

main();
