import mysql from "mysql2/promise";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(__dirname, "../../.env") });

async function createDatabase() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD,
  });

  const dbName = process.env.DB_NAME || "showtime_hub";

  try {
    await connection.query(`DROP DATABASE IF EXISTS \`${dbName}\`;`);
    console.log(`🗑️  Dropped database: ${dbName}`);

    await connection.query(`CREATE DATABASE \`${dbName}\`;`);
    console.log(`✅ Created database: ${dbName}`);
  } catch (error) {
    console.error("❌ Error creating database:", error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

createDatabase();
