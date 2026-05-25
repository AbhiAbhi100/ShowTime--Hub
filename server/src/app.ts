import express from "express";
import cors from "cors";
import compression from "compression";
import config from "./config";
import logger from "./utils/logger";
import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./config/swagger";
import sequelize from "./config/database";

// Import middleware
import {
  requestId,
  requestLogger,
  errorHandler,
  notFoundHandler,
  apiLimiter,
  securityHeaders,
  sanitizeInput,
} from "./middleware/common";

// Import routes
import authRoutes from "./routes/auth";
import movieRoutes from "./routes/movies";
import theatreRoutes from "./routes/theatres";
import showRoutes from "./routes/shows";
import bookingRoutes from "./routes/bookings";
import cityRoutes from "./routes/cities";
import adminRoutes from "./routes/admin";
import profileRoutes from "./routes/profile";
import aiRoutes from "./routes/ai.routes";

const app = express();

// Trust proxy (for rate limiting behind reverse proxy)
app.set("trust proxy", 1);

// Security middleware
app.use(securityHeaders);

// Request ID and logging
app.use(requestId);
app.use(requestLogger);
app.use((req, res, next) => {
  console.log(`[DEBUG] Incoming Request: ${req.method} ${req.url}`);
  next();
});

// Body parsing
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// Input sanitization
app.use(sanitizeInput);

// Compression
app.use(compression());

// CORS
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman)
      if (!origin) return callback(null, true);
      
      // Allow any localhost origin for development
      if (origin.match(/^http:\/\/localhost:\d+$/) || origin.match(/^http:\/\/127\.0\.0\.1:\d+$/)) {
          return callback(null, true);
      }

      const allowedOrigins = [
        config.clientUrl,
        "http://localhost:8080",
        "http://localhost:8081",
        "http://localhost:8082",
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:8080",
        "http://127.0.0.1:8081",
        "http://127.0.0.1:5173",
      ];

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        logger.warn(`CORS blocked origin: ${origin}`);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id", "Idempotency-Key"],
  })
);

// Rate limiting
app.use("/api/", apiLimiter);

// Health check (before other routes)
app.get("/api/health", async (_req, res) => {
  let dbStatus = "disconnected";
  try {
    await sequelize.authenticate();
    dbStatus = "connected";
  } catch (error) {
    dbStatus = "error";
  }

  const healthcheck = {
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.nodeEnv,
    database: dbStatus,
  };
  res.json(healthcheck);
});

// Swagger UI
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// API Routes (v1)
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/movies", movieRoutes);
app.use("/api/v1/theatres", theatreRoutes);
app.use("/api/v1/shows", showRoutes);
app.use("/api/v1/bookings", bookingRoutes);
app.use("/api/v1/cities", cityRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/profile", profileRoutes);
app.use("/api/v1/ai", aiRoutes);

// Backward compatible routes (without version)
app.use("/api/auth", authRoutes);
app.use("/api/movies", movieRoutes);
app.use("/api/theatres", theatreRoutes);
app.use("/api/shows", showRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/cities", cityRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/ai", aiRoutes);

// Serve static files from the React frontend app
import path from "path";
const publicPath = path.join(__dirname, "../public");
app.use(express.static(publicPath));

// Wildcard route to serve React's index.html for SPA routing
app.get("*", (req, res, next) => {
  if (req.url.startsWith("/api") || req.url.startsWith("/api-docs")) {
    return next();
  }
  res.sendFile(path.join(publicPath, "index.html"), (err) => {
    if (err) {
      next();
    }
  });
});

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

export default app;
