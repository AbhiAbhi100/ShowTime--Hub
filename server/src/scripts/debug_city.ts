import dotenv from "dotenv";
import path from "path";
import sequelize from "../config/database";
import { City } from "../models";

dotenv.config({ path: path.join(__dirname, "../../.env") });

async function debugCity() {
  try {
    await sequelize.authenticate();
    console.log("✅ Authenticated");

    // 1. Check Table Schema
    const [results] = await sequelize.query("DESCRIBE cities;");
    console.log("📋 Table Schema:", results);

    // 2. Try to fetch a city
    const city = await City.findOne();
    if (!city) {
      console.log("⚠️ No cities found to test");
      return;
    }
    console.log("found city", city.name);

    // 3. Try soft delete
    console.log("🔄 Attempting soft delete...");
    city.isActive = false;
    await city.save();
    console.log("✅ Soft delete successful");
    
    // Revert
    city.isActive = true;
    await city.save();
    console.log("✅ Reverted change");

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await sequelize.close();
  }
}

debugCity();
