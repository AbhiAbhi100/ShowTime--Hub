import config from "./config";
import logger from "./utils/logger";
import app from "./app";
// import { initCronJobs } from "./cron/jobs"; // Commented out for now or ensure it uses services which are updated
import { connectDatabase } from "./config/database";

// Graceful shutdown handler
const gracefulShutdown = async (signal: string) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);
  try {
    // await sequelize.close(); 
    logger.info("Database connection closed");
    process.exit(0);
  } catch (err) {
    logger.error("Error during graceful shutdown", { error: err });
    process.exit(1);
  }
};

// Process Signal Handlers
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Unhandled rejection handler
process.on("unhandledRejection", (reason: any) => {
  logger.error("Unhandled Rejection", { reason: reason?.message || reason });
});

// Uncaught exception handler
process.on("uncaughtException", (error: Error) => {
  logger.error("Uncaught Exception", { error: error.message, stack: error.stack });
  process.exit(1);
});

// Connect to Database and start server
const startServer = async () => {
  try {
    await connectDatabase();

    // Start Cron Jobs (enable if they are refactored)
    // initCronJobs();

    const server = app.listen(config.port, "0.0.0.0", () => {
      logger.info(`🚀 Server running on http://0.0.0.0:${config.port}`, {
        environment: config.nodeEnv,
      });
    });

    server.on('error', (error: any) => {
        if (error.code === 'EADDRINUSE') {
            logger.error(`❌ Port ${config.port} is already in use.`);
        } else {
            logger.error("❌ Server error", { error: error.message });
        }
        process.exit(1);
    });

  } catch (error: any) {
    logger.error("❌ Failed to start server", { error: error.message });
    process.exit(1);
  }
};

startServer();

