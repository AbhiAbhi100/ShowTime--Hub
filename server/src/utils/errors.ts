/**
 * Custom Error Classes for Structured Error Handling
 */

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly details?: any;

  constructor(
    statusCode: number,
    message: string,
    code: string,
    isOperational = true,
    details?: any
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.details = details;

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);
  }
}

// 400 Bad Request
export class BadRequestError extends AppError {
  constructor(message = "Bad request", details?: any) {
    super(400, message, "BAD_REQUEST", true, details);
  }
}

// 401 Unauthorized
export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized access") {
    super(401, message, "UNAUTHORIZED", true);
  }
}

// 403 Forbidden
export class ForbiddenError extends AppError {
  constructor(message = "Access forbidden") {
    super(403, message, "FORBIDDEN", true);
  }
}

// 404 Not Found
export class NotFoundError extends AppError {
  constructor(resource = "Resource") {
    super(404, `${resource} not found`, "NOT_FOUND", true);
  }
}

// 409 Conflict
export class ConflictError extends AppError {
  constructor(message = "Resource conflict", details?: any) {
    super(409, message, "CONFLICT", true, details);
  }
}

// 422 Validation Error
export class ValidationError extends AppError {
  constructor(message = "Validation failed", details?: any) {
    super(422, message, "VALIDATION_ERROR", true, details);
  }
}

// 429 Too Many Requests
export class TooManyRequestsError extends AppError {
  constructor(message = "Too many requests, please try again later") {
    super(429, message, "TOO_MANY_REQUESTS", true);
  }
}

// 500 Internal Server Error
export class InternalServerError extends AppError {
  constructor(message = "Internal server error") {
    super(500, message, "INTERNAL_ERROR", false);
  }
}

// 503 Service Unavailable
export class ServiceUnavailableError extends AppError {
  constructor(message = "Service temporarily unavailable") {
    super(503, message, "SERVICE_UNAVAILABLE", true);
  }
}

// Business Logic Errors
export class SeatAlreadyBookedError extends ConflictError {
  constructor(seats: string[]) {
    super(`Seats already booked: ${seats.join(", ")}`, { seats });
  }
}

export class SeatLockExpiredError extends ConflictError {
  constructor() {
    super("Seat lock has expired. Please select seats again.");
  }
}

export class PaymentFailedError extends AppError {
  constructor(message = "Payment processing failed", details?: any) {
    super(402, message, "PAYMENT_FAILED", true, details);
  }
}

export class ShowNotAvailableError extends BadRequestError {
  constructor() {
    super("Show is no longer available for booking");
  }
}

export class InsufficientSeatsError extends BadRequestError {
  constructor(available: number, requested: number) {
    super(`Only ${available} seats available, but ${requested} requested`, {
      available,
      requested,
    });
  }
}
