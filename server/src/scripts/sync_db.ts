import dotenv from "dotenv";
import path from "path";
import sequelize from "../config/database";
import "../models"; // Import all models

// Load environment variables
dotenv.config({ path: path.join(__dirname, "../../.env") });

async function syncDatabase() {
  console.log("🔄 Syncing Database Schema...");
  try {
    await sequelize.authenticate();
    console.log("✅ Database connected");
    
    // Sync all models
    await sequelize.sync({ alter: true });
    console.log("✅ Database synced successfully (Alter mode)");
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Sync failed:", error);
    process.exit(1);
  }
}

syncDatabase();
