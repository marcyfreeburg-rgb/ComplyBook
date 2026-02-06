const { Pool: NeonPool, neonConfig } = require('@neondatabase/serverless');
const ws = require('ws');
neonConfig.webSocketConstructor = ws;

let devUrl = process.env.NEON_PRODUCTION_DATABASE_URL;
if (devUrl && devUrl.includes('-pooler')) devUrl = devUrl.replace('-pooler', '');
const devPool = new NeonPool({ connectionString: devUrl, max: 5 });

let prodUrl = process.env.RENDER_PRODUCTION_DATABASE_URL;
if (prodUrl && prodUrl.includes('-pooler')) prodUrl = prodUrl.replace('-pooler', '');
const prodPool = new NeonPool({ connectionString: prodUrl, max: 5 });

function formatValue(val, colType) {
  if (val === null || val === undefined) return 'NULL';
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
  if (colType.udt_name === 'jsonb' || colType.udt_name === 'json') {
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
    const devCount = parseInt((await devPool.query(`SELECT COUNT(*) FROM ${tableName}`)).rows[0].count);
    if (devCount === 0) return null;
    
    const prodCount = parseInt((await prodPool.query(`SELECT COUNT(*) FROM ${tableName}`)).rows[0].count);
    if (prodCount >= devCount) return { table: tableName, status: 'exists', count: prodCount };
    
    const colInfoRows = (await prodPool.query(
      `SELECT column_name, data_type, udt_name, is_identity FROM information_schema.columns 
       WHERE table_name = $1 AND table_schema = 'public' ORDER BY ordinal_position`, [tableName]
    )).rows;
    const columns = colInfoRows.map(r => r.column_name);
    const columnTypes = {};
    colInfoRows.forEach(r => { columnTypes[r.column_name] = { data_type: r.data_type, udt_name: r.udt_name }; });
    const hasIdentity = colInfoRows.some(r => r.is_identity === 'YES');
    const columnList = columns.map(c => `"${c}"`).join(', ');
    
    const allRows = await devPool.query(`SELECT * FROM ${tableName} ORDER BY 1`);
    let inserted = 0, errors = 0;
    
    // Batch insert 25 at a time
    for (let i = 0; i < allRows.rows.length; i += 25) {
      const batch = allRows.rows.slice(i, i + 25);
      const valuesSets = batch.map(row => {
        const vals = columns.map(col => formatValue(row[col], columnTypes[col]));
        return '(' + vals.join(', ') + ')';
      });
      
      const overriding = hasIdentity ? ' OVERRIDING SYSTEM VALUE' : '';
      const sql = `INSERT INTO ${tableName} (${columnList})${overriding} VALUES ${valuesSets.join(', ')} ON CONFLICT DO NOTHING`;
      
      try {
        const res = await prodPool.query(sql);
        inserted += res.rowCount || 0;
      } catch(e) {
        // Fallback to individual inserts
        for (const row of batch) {
          const vals = columns.map(col => formatValue(row[col], columnTypes[col]));
          try {
            await prodPool.query(`INSERT INTO ${tableName} (${columnList})${overriding} VALUES (${vals.join(', ')}) ON CONFLICT DO NOTHING`);
            inserted++;
          } catch(e2) {
            if (errors < 2) console.error(`  ${tableName} err: ${e2.message.substring(0, 100)}`);
            errors++;
          }
        }
      }
    }
    
    if (hasIdentity) {
      try {
        await prodPool.query(`SELECT setval(pg_get_serial_sequence('${tableName}', 'id'), (SELECT COALESCE(MAX(id), 1) FROM ${tableName}))`);
      } catch(e) {}
    }
    
    return { table: tableName, status: errors > 0 ? 'partial' : 'ok', count: inserted, errors };
  } catch(e) {
    return { table: tableName, status: 'error', error: e.message.substring(0, 120) };
  }
}

async function main() {
  const tables = [
    'recurring_transactions', 'bank_reconciliations',
    'pledges', 'fundraising_campaigns', 'donor_letters', 'donor_access_tokens',
    'proposals', 'contract_milestones', 'deductions', 'payroll_runs',
    'compliance_events', 'custom_reports', 'tax_reports', 'audit_prep_items',
    'form_questions', 'dismissed_patterns', 'scheduled_payments',
    'invoice_line_items', 'bill_line_items', 'bill_payments',
    'bank_statement_entries', 'categorization_history', 'reconciliation_matches',
    'in_kind_donations', 'expense_approvals', 'documents',
    'change_orders', 'time_entries', 'project_costs',
    'payroll_items', 'paystubs', 'form_responses', 'tax_form_1099s',
    'budget_items', 'budget_income_items', 'transaction_attachments',
  ];
  
  console.log('Migrating remaining tables...');
  let total = 0;
  
  for (const t of tables) {
    const r = await migrateTable(t);
    if (!r) continue;
    if (r.status === 'ok') { console.log(`✓ ${r.table}: ${r.count}`); total += r.count; }
    else if (r.status === 'partial') { console.log(`~ ${r.table}: ${r.count} (${r.errors} errors)`); total += r.count; }
    else if (r.status === 'exists') { console.log(`= ${r.table}: already ${r.count}`); }
    else if (r.status === 'error') { console.log(`✗ ${r.table}: ${r.error}`); }
  }
  
  console.log(`\nTotal additional rows: ${total}`);
  devPool.end();
  prodPool.end();
}
main();
