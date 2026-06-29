import mysql from "mysql2/promise";

// Create connection pool using env variables
const pool = mysql.createPool({
  host: process.env.DB_HOST || "srv1333.hstgr.io",
  user: process.env.DB_USER || "u134126815_vercel1",
  password: process.env.DB_PASSWORD || "Rishav_9162809260",
  database: process.env.DB_NAME || "u134126815_vercel1",
  port: parseInt(process.env.DB_PORT || "3306", 10),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

/**
 * Global Query Helper Function
 * @param sql SQL Query string
 * @param values Array of query parameters
 */
export async function query(sql: string, values?: any[]) {
  try {
    const [results] = await pool.execute(sql, values);
    return results;
  } catch (error: any) {
    console.error("Database Query Error:", error.message);
    throw error;
  }
}

// Function to initialize the required tables if they do not exist
export async function initDb() {
  const createUsersTableQuery = `
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      name VARCHAR(255) NULL,
      username VARCHAR(255) NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      reset_token VARCHAR(255) NULL,
      reset_token_expiry TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const createRedirectsTableQuery = `
    CREATE TABLE IF NOT EXISTS redirects (
      id INT AUTO_INCREMENT PRIMARY KEY,
      short_id VARCHAR(10) NOT NULL UNIQUE,
      original_url TEXT NOT NULL,
      wp_post_path VARCHAR(255),
      custom_title VARCHAR(255),
      custom_desc TEXT,
      custom_image TEXT,
      user_id INT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `;

  try {
    // 1. Create users table first
    await query(createUsersTableQuery);

    // Dynamic schema migrations for existing databases
    try {
      await query("ALTER TABLE users ADD COLUMN name VARCHAR(255) NULL");
    } catch (e) {}
    try {
      await query("ALTER TABLE users ADD COLUMN username VARCHAR(255) NULL UNIQUE");
    } catch (e) {}
    
    // 2. Create redirects table (depends on users table)
    await query(createRedirectsTableQuery);
    
    console.log("Database tables ('users', 'redirects') initialized successfully.");
  } catch (error: any) {
    console.error("Failed to initialize database tables:", error.message);
  }
}
