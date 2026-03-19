import { Request } from "express";
import { User } from "../models/User";

// Extend Express Request
export interface AuthRequest extends Request {
  user?: User;
  requestId?: string;
}

// API Response Envelope
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
  requestId?: string;
  timestamp?: string;
}

// Pagination
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Booking Types
export interface CreateBookingDTO {
  movieId: string;
  movieTitle: string;
  moviePoster?: string;
  theatreName: string;
  theatreLocation?: string;
  showTime: string;
  showDate: string;
  seats: string[];
  totalAmount: number;
  showId?: string;
}

export interface BookingResult {
  bookingId: string;
  status: string;
  seats: string[];
  totalAmount: number;
}

// Show Types
export interface CreateShowDTO {
  movieId: string;
  movieType: "tmdb" | "custom";
  theatre: string;
  showDate: string;
  showTime: string;
  priceRegular?: number;
  pricePremium?: number;
  priceVip?: number;
}

// Seat Lock Types
export interface SeatLock {
  seatId: string;
  showId: string;
  userId: string;
  expiresAt: Date;
}

// Payment Types
export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: string;
  clientSecret?: string;
}

export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  error?: string;
}

// Email Types
export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

// Theatre Seat Configuration
export interface SeatConfig {
  rows: number;
  seatsPerRow: number;
  premiumRows: string[];
  vipRows: string[];
}
