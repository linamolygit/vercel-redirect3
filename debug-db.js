const mysql = require('./node_modules/mysql2/promise');

async function test() {
  const conn = await mysql.createConnection({
    host: 'srv1333.hstgr.io',
    user: 'u134126815_vercel1',
    password: 'Rishav_9162809260',
    database: 'u134126815_vercel1',
    port: 3306
  });
  
  console.log('Connected!');
  
  try {
    // Check tables
    const [tables] = await conn.query("SHOW TABLES");
    console.log('Tables:', JSON.stringify(tables));
    
    // Check if analytics table exists
    const [analyticsCheck] = await conn.query("SHOW TABLES LIKE 'analytics'");
    console.log('analytics table exists:', analyticsCheck.length > 0);
    
    if (analyticsCheck.length > 0) {
      const [cols] = await conn.query("DESCRIBE analytics");
      console.log('Analytics columns:', JSON.stringify(cols.map(c => c.Field)));
      
      const [count] = await conn.query("SELECT COUNT(*) as total FROM analytics");
      console.log('Analytics row count:', count[0].total);
    }
    
    // Check redirects
    const [redirects] = await conn.query("SELECT id, short_id, user_id FROM redirects LIMIT 5");
    console.log('Sample redirects:', JSON.stringify(redirects));
    
  } catch(e) {
    console.error('Error:', e.message, e.code);
  }
  
  await conn.end();
}

test().catch(e => console.error('Fatal:', e.message));
