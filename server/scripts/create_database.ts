import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars from ../.env (relative to scripts/ folder)
dotenv.config({ path: path.join(__dirname, '../.env') });

const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;

async function createDatabase() {
  console.log(`Connecting to MySQL at ${DB_HOST}:${DB_PORT} as ${DB_USER}...`);
  try {
    const connection = await mysql.createConnection({
      host: DB_HOST,
      port: parseInt(DB_PORT || '3306'),
      user: DB_USER,
      password: DB_PASSWORD,
    });

    console.log(`Creating database '${DB_NAME}' if it doesn't exist...`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\`;`);
    console.log(`✅ Database '${DB_NAME}' created successfully.`);
    
    await connection.end();
  } catch (error) {
    console.error('❌ Error creating database:', error);
    process.exit(1);
  }
}

createDatabase();
