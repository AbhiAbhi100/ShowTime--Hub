import { Router, Request, Response } from "express";
import { paymentService } from "../services/payment.service";
import { asyncHandler, validateRequest } from "../middleware/common";
import { body } from "express-validator";
import { authenticate } from "../middleware/auth";
import { AuthRequest } from "../types";
import { sendSuccess, sendError } from "../utils/helpers";
import logger from "../utils/logger";

const router = Router();

/**
 * Create payment intent
 * POST /api/payments/create-intent
 */
router.post(
  "/create-intent",
  authenticate,
  [
    body("amount").isFloat({ min: 1 }).withMessage("Amount must be greater than 0"),
    body("bookingDetails").isObject().withMessage("Booking details required"),
  ],
  validateRequest,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { amount, bookingDetails } = req.body;

    if (!paymentService.isAvailable()) {
      return sendError(res, 503, "PAYMENT_UNAVAILABLE", "Payment service is not available");
    }

    const result = await paymentService.createPaymentIntent(amount, "inr", {
      userId: req.user?.id || "",
      movieId: bookingDetails.movieId,
      showId: bookingDetails.showId || "",
      seats: JSON.stringify(bookingDetails.seats),
    });

    sendSuccess(res, {
      clientSecret: result.clientSecret,
      paymentIntentId: result.paymentIntentId,
    });
  })
);

/**
 * Confirm payment
 * POST /api/payments/confirm
 */
router.post(
  "/confirm",
  authenticate,
  [body("paymentIntentId").notEmpty().withMessage("Payment intent ID required")],
  validateRequest,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { paymentIntentId } = req.body;

    const isSuccessful = await paymentService.confirmPayment(paymentIntentId);

    sendSuccess(res, { success: isSuccessful });
  })
);

/**
 * Get payment details
 * GET /api/payments/:paymentIntentId
 */
router.get(
  "/:paymentIntentId",
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { paymentIntentId } = req.params;

    const details = await paymentService.getPaymentDetails(paymentIntentId);

    sendSuccess(res, details);
  })
);

/**
 * Stripe webhook handler
 * POST /api/payments/webhook
 */
router.post(
  "/webhook",
  asyncHandler(async (req: Request, res: Response) => {
    const signature = req.headers["stripe-signature"] as string;

    if (!signature) {
      return sendError(res, 400, "INVALID_WEBHOOK", "Missing stripe signature");
    }

    const event = await paymentService.handleWebhook(
      req.body, // Raw body
      signature
    );

    // Handle different event types
    switch (event.type) {
      case "payment_intent.succeeded":
        logger.info("Payment succeeded", {
          paymentIntentId: event.data.id,
          amount: event.data.amount,
        });
        // TODO: Update booking status to confirmed
        break;

      case "payment_intent.payment_failed":
        logger.warn("Payment failed", {
          paymentIntentId: event.data.id,
          error: event.data.last_payment_error?.message,
        });
        // TODO: Update booking status to failed, release seats
        break;

      case "charge.refunded":
        logger.info("Charge refunded", {
          chargeId: event.data.id,
          amount: event.data.amount_refunded,
        });
        break;

      default:
        logger.info("Unhandled webhook event", { type: event.type });
    }

    sendSuccess(res, { received: true });
  })
);

export default router;
