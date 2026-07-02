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
    // Check redirect_id=29
    const [r29] = await conn.query("SELECT id, short_id, user_id FROM redirects WHERE id = 29");
    console.log('redirect_id=29:', JSON.stringify(r29));

    // All redirects count
    const [cnt] = await conn.query("SELECT COUNT(*) as total FROM redirects");
    console.log('Total redirects:', cnt[0].total);

    // Get ALL redirects with id >= 25
    const [recent] = await conn.query("SELECT id, short_id, user_id FROM redirects WHERE id >= 25");
    console.log('Redirects >= 25:', JSON.stringify(recent));
    
  } catch(e) {
    console.error('Error:', e.message);
  }
  
  await conn.end();
}

test().catch(e => console.error('Fatal:', e.message));
