import { Sequelize } from "sequelize-typescript";
import config from "./index";
import logger from "../utils/logger";
import * as models from "../models";

const sequelize = (process.env.MYSQL_URL || process.env.DATABASE_URL)
  ? new Sequelize(process.env.MYSQL_URL || process.env.DATABASE_URL!, {
      dialect: "mysql",
      logging: (msg) => logger.debug(msg),
      models: Object.values(models),
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
    })
  : new Sequelize({
      dialect: "mysql",
      host: config.mysql.host,
      port: config.mysql.port,
      username: config.mysql.user,
      password: config.mysql.password,
      database: config.mysql.database,
      logging: (msg) => logger.debug(msg),
      models: Object.values(models),
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
    });

export const connectDatabase = async () => {
  let retries = 5;
  while (retries > 0) {
    try {
      await sequelize.authenticate();
      logger.info("✅ Connected to MySQL Database");
      
      // Sync models
      await sequelize.sync();
      logger.info("✅ Database models synchronized");
      return;
    } catch (error) {
      retries--;
      logger.error(`❌ Unable to connect to the database (Retries left: ${retries}):`, error);
      if (retries === 0) {
        process.exit(1);
      }
      // Wait 5 seconds before retrying
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
};

export default sequelize;
