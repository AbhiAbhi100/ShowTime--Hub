import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import { v4 as uuidv4 } from "uuid";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import mongoSanitize from "express-mongo-sanitize";
import { AppError, ValidationError, TooManyRequestsError } from "../utils/errors";
import { sendError } from "../utils/helpers";
import logger, { createRequestLogger } from "../utils/logger";
import config from "../config";
import { AuthRequest } from "../types";

/**
 * Request ID middleware - adds unique ID to each request
 */
export const requestId = (req: AuthRequest, res: Response, next: NextFunction) => {
  req.requestId = (req.headers["x-request-id"] as string) || uuidv4();
  res.setHeader("X-Request-Id", req.requestId);
  next();
};

/**
 * Request logging middleware
 */
export const requestLogger = (req: AuthRequest, res: Response, next: NextFunction) => {
  const start = Date.now();
  const requestLogger = createRequestLogger(req.requestId || "unknown");

  res.on("finish", () => {
    const duration = Date.now() - start;
    requestLogger.info(`${req.method} ${req.originalUrl}`, {
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get("user-agent"),
    });
  });

  next();
};

/**
 * Validation error handler - converts express-validator errors to our format
 */
export const validateRequest = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((err: any) => ({
      field: err.path,
      message: err.msg,
    }));
    return sendError(res, 422, "VALIDATION_ERROR", "Validation failed", formattedErrors);
  }
  next();
};

/**
 * Global error handler
 */
export const errorHandler = (err: Error, req: AuthRequest, res: Response, _next: NextFunction) => {
  const requestLogger = createRequestLogger(req.requestId || "unknown");

  // Log the error
  if (err instanceof AppError && err.isOperational) {
    requestLogger.warn(err.message, { code: err.code, details: err.details });
  } else {
    requestLogger.error("Unhandled error", { error: err.message, stack: err.stack });
  }

  // Handle known errors
  if (err instanceof AppError) {
    return sendError(res, err.statusCode, err.code, err.message, err.details);
  }

  // Handle mongoose validation errors
  if (err.name === "ValidationError") {
    return sendError(res, 422, "VALIDATION_ERROR", "Validation failed", err.message);
  }

  // Handle mongoose cast errors (invalid ObjectId)
  if (err.name === "CastError") {
    return sendError(res, 400, "INVALID_ID", "Invalid ID format");
  }

  // Handle duplicate key errors
  if ((err as any).code === 11000) {
    return sendError(res, 409, "DUPLICATE_KEY", "Resource already exists");
  }

  // Handle JWT errors
  if (err.name === "JsonWebTokenError") {
    return sendError(res, 401, "INVALID_TOKEN", "Invalid authentication token");
  }

  if (err.name === "TokenExpiredError") {
    return sendError(res, 401, "TOKEN_EXPIRED", "Authentication token has expired");
  }

  // Default error
  const message = config.isDev ? err.message : "Internal server error";
  return sendError(res, 500, "INTERNAL_ERROR", message);
};

/**
 * 404 handler
 */
export const notFoundHandler = (req: Request, res: Response) => {
  sendError(res, 404, "NOT_FOUND", `Route ${req.method} ${req.originalUrl} not found`);
};

/**
 * Rate limiter configuration
 */
export const apiLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    sendError(res, 429, "TOO_MANY_REQUESTS", "Too many requests, please try again later");
  },
});

/**
 * Stricter rate limiter for auth routes
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: config.isDev ? 100 : 10, // 10 attempts per window in prod, 100 in dev
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    sendError(res, 429, "TOO_MANY_REQUESTS", "Too many login attempts, please try again later");
  },
});

/**
 * Security headers middleware
 */
export const securityHeaders = helmet({
  contentSecurityPolicy: config.isProd ? undefined : false,
  crossOriginEmbedderPolicy: false,
});

/**
 * MongoDB query sanitization
 */
export const sanitizeInput = mongoSanitize();

/**
 * Async handler wrapper - catches errors in async route handlers
 */
export const asyncHandler = (
  fn: (req: AuthRequest, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
