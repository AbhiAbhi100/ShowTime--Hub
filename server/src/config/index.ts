import dotenv from "dotenv";

dotenv.config();

export const config = {
  // Server
  port: parseInt(process.env.PORT || "5000", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  isDev: process.env.NODE_ENV !== "production",
  isProd: process.env.NODE_ENV === "production",

  // Database
  // Database
  mysql: {
    host: process.env.DB_HOST || process.env.MYSQLHOST || "localhost",
    port: parseInt(process.env.DB_PORT || process.env.MYSQLPORT || "3306", 10),
    user: process.env.DB_USER || process.env.MYSQLUSER || "root",
    password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || "",
    database: process.env.DB_NAME || process.env.MYSQLDATABASE || "showtime_hub",
  },

  // JWT
  jwtSecret: process.env.JWT_SECRET || "your-super-secret-key-change-in-production",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "30d",

  // Client
  clientUrl: process.env.CLIENT_URL || "http://localhost:8081",

  // TMDB
  tmdbApiKey: process.env.TMDB_API_KEY || "",
  tmdbBaseUrl: "https://api.themoviedb.org/3",
  tmdbImageBase: "https://image.tmdb.org/t/p",

  // Email (for notifications)
  smtp: {
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    from: process.env.SMTP_FROM || "noreply@showtimehub.com",
  },

  // Payment (Stripe/Razorpay)
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || "",
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",
  },
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || "",
    keySecret: process.env.RAZORPAY_KEY_SECRET || "",
  },

  // Rate Limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
  },

  // Seat Lock TTL (in seconds)
  seatLockTTL: parseInt(process.env.SEAT_LOCK_TTL || "600", 10), // 10 minutes

  // Logging
  logLevel: process.env.LOG_LEVEL || "info",

  // Gemini AI
  geminiApiKey: process.env.GEMINI_API_KEY || "",
};

export default config;
