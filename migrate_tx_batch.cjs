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

async function main() {
  // Get existing transaction IDs in prod to skip them
  const existingRes = await prodPool.query('SELECT id FROM transactions');
  const existingIds = new Set(existingRes.rows.map(r => r.id));
  console.log('Already in prod:', existingIds.size);
  
  // Get column info
  const colInfoRows = (await prodPool.query(
    `SELECT column_name, data_type, udt_name FROM information_schema.columns 
     WHERE table_name = 'transactions' AND table_schema = 'public' ORDER BY ordinal_position`
  )).rows;
  const columns = colInfoRows.map(r => r.column_name);
  const columnTypes = {};
  colInfoRows.forEach(r => { columnTypes[r.column_name] = { data_type: r.data_type, udt_name: r.udt_name }; });
  const columnList = columns.map(c => `"${c}"`).join(', ');
  
  // Get all transactions from dev
  const allTx = await devPool.query('SELECT * FROM transactions ORDER BY id');
  const toInsert = allTx.rows.filter(r => !existingIds.has(r.id));
  console.log('Need to insert:', toInsert.length);
  
  // Insert in batches of 25 rows using multi-row INSERT
  const batchSize = 25;
  let inserted = 0;
  let errors = 0;
  
  for (let i = 0; i < toInsert.length; i += batchSize) {
    const batch = toInsert.slice(i, i + batchSize);
    const valuesSets = batch.map(row => {
      const vals = columns.map(col => formatValue(row[col], columnTypes[col]));
      return '(' + vals.join(', ') + ')';
    });
    
    const sql = `INSERT INTO transactions (${columnList}) OVERRIDING SYSTEM VALUE VALUES ${valuesSets.join(', ')} ON CONFLICT DO NOTHING`;
    
    try {
      const result = await prodPool.query(sql);
      inserted += result.rowCount || batch.length;
    } catch(e) {
      // Fall back to individual inserts for this batch
      for (const row of batch) {
        const vals = columns.map(col => formatValue(row[col], columnTypes[col]));
        try {
          await prodPool.query(`INSERT INTO transactions (${columnList}) OVERRIDING SYSTEM VALUE VALUES (${vals.join(', ')}) ON CONFLICT DO NOTHING`);
          inserted++;
        } catch(e2) {
          if (errors < 5) console.error('Error:', e2.message.substring(0, 100));
          errors++;
        }
      }
    }
    
    if ((i + batchSize) % 500 === 0 || i + batchSize >= toInsert.length) {
      console.log(`Progress: ${Math.min(i + batchSize, toInsert.length)}/${toInsert.length} (inserted: ${inserted}, errors: ${errors})`);
    }
  }
  
  // Reset sequence
  await prodPool.query("SELECT setval(pg_get_serial_sequence('transactions', 'id'), (SELECT COALESCE(MAX(id), 1) FROM transactions))");
  
  const finalCount = await prodPool.query('SELECT COUNT(*) FROM transactions');
  console.log('\nFinal transaction count in prod:', finalCount.rows[0].count);
  
  devPool.end();
  prodPool.end();
}
main();
