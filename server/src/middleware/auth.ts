import { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
// import { User } from "../models"; - Removed to fix circular dependency
import { AuthRequest } from "../types";

// Verify JWT token
export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Access denied. No token provided." });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
        return res.status(401).json({ error: "Access denied. Invalid token format." });
    }
    
    // In production, use a strong secret
    const secret = process.env.JWT_SECRET || "fallback-secret";

    const decoded = jwt.verify(token, secret) as {
      userId: string;
    };


    // Use require to avoid circular dependency
    const { User } = require("../models/User");
    const user = await User.findByPk(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: "User not found." });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(401).json({ error: "Invalid token." });
  }
};

// Optional authentication - doesn't fail if no token
export const optionalAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next();
    }

    const token = authHeader.split(" ")[1];
    const secret = process.env.JWT_SECRET || "fallback-secret";

    try {
      const decoded = jwt.verify(token, secret) as {
        userId: string;
      };

      // Use require to avoid circular dependency
      const { User } = require("../models/User");
      const user = await User.findByPk(decoded.userId);
      if (user) {
        req.user = user;
      }
    } catch {
      // Token invalid, but continue without user
    }

    next();
  } catch (error) {
    next();
  }
};

// Admin only middleware
export const adminOnly = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Ensure authenticate was called or user is set
    if (!req.user) {
      return res.status(401).json({ error: "Access denied. Not authenticated." });
    }

    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Access denied. Admin only." });
    }
    
    // req.admin = req.user; // Removed as we rely on req.user and roles
    next();
  } catch (error) {
    console.error("Admin middleware error:", error);
    return res.status(401).json({ error: "Invalid token." });
  }
};

// Generate JWT token
export const generateToken = (userId: string, role: string = "user"): string => {
  const secret = process.env.JWT_SECRET || "fallback-secret";
  const expiresIn = process.env.JWT_EXPIRES_IN || "7d";

  return jwt.sign({ userId, role }, secret, { expiresIn } as jwt.SignOptions);
};
