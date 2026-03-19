import { Sequelize } from "sequelize-typescript";
import config from "./index";
import logger from "../utils/logger";
import * as models from "../models";

const sequelize = new Sequelize({
  dialect: "mysql",
  host: config.mysql.host,
  port: config.mysql.port,
  username: config.mysql.user,
  password: config.mysql.password,
  database: config.mysql.database,
  logging: (msg) => logger.debug(msg), // Use our logger for SQL queries
  models: Object.values(models), // Load models explicitly
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
});

export const connectDatabase = async () => {
  try {
    await sequelize.authenticate();
    logger.info("✅ Connected to MySQL Database");
    
    // Sync models (alter: true updates schema without dropping data if possible)
    // In production, you might want to use migrations instead of sync
    // Sync models
    // Changed to default sync (no alter) to avoid "Too many keys" error on startups
    await sequelize.sync();
    logger.info("✅ Database models synchronized");
  } catch (error) {
    logger.error("❌ Unable to connect to the database:", error);
    process.exit(1);
  }
};

export default sequelize;
