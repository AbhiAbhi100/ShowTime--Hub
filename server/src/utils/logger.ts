import winston from "winston";
import config from "../config";

const { combine, timestamp, printf, colorize, errors } = winston.format;

// Custom log format
const logFormat = printf(({ level, message, timestamp, requestId, ...metadata }) => {
  let log = `${timestamp} [${level}]`;

  if (requestId) {
    log += ` [${requestId}]`;
  }

  log += `: ${message}`;

  if (Object.keys(metadata).length > 0) {
    log += ` ${JSON.stringify(metadata)}`;
  }

  return log;
});

// Create logger instance
const logger = winston.createLogger({
  level: config.logLevel,
  format: combine(errors({ stack: true }), timestamp({ format: "YYYY-MM-DD HH:mm:ss" }), logFormat),
  defaultMeta: { service: "showtime-hub" },
  transports: [
    // Write all logs to console
    new winston.transports.Console({
      format: combine(
        colorize({ all: true }),
        timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        logFormat
      ),
    }),
  ],
});

// Add file transports in production
if (config.isProd) {
  logger.add(
    new winston.transports.File({
      filename: "logs/error.log",
      level: "error",
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
  logger.add(
    new winston.transports.File({
      filename: "logs/combined.log",
      maxsize: 5242880,
      maxFiles: 5,
    })
  );
}

// Create child logger with request context
export const createRequestLogger = (requestId: string) => {
  return logger.child({ requestId });
};

// HTTP request logger middleware format
export const httpLogFormat = ":method :url :status :response-time ms - :res[content-length]";

export default logger;
