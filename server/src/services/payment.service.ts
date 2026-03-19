import Stripe from "stripe";
import config from "../config";
import logger from "../utils/logger";
import { PaymentFailedError } from "../utils/errors";
import { Payment } from "../models/Payment";

class PaymentService {
  private stripe: Stripe | null = null;

  constructor() {
    if (config.stripe.secretKey) {
      this.stripe = new Stripe(config.stripe.secretKey, {
        apiVersion: "2023-10-16",
      });
      logger.info("Stripe payment service initialized");
    } else {
      logger.warn("Stripe not configured. Payment service disabled.");
    }
  }

  /**
   * Create a payment intent for booking
   */
  async createPaymentIntent(
    amount: number,
    currency: string = "inr",
    metadata?: Record<string, string>
  ): Promise<{
    clientSecret: string;
    paymentIntentId: string;
  }> {
    if (!this.stripe) {
      throw new PaymentFailedError("Payment service not configured");
    }

    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to smallest currency unit
        currency,
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          ...metadata,
          created_at: new Date().toISOString(),
        },
      });

      // KEY CHANGE: Record initial payment attempt in DB
      await Payment.create({
        userId: metadata?.userId,
        bookingId: metadata?.bookingId || null, // Might be null initially if booking created after payment
        amount: amount,
        currency: currency,
        status: "pending",
        paymentMethod: "stripe",
        transactionId: paymentIntent.id,
        metadata: metadata,
        paymentDate: new Date(),
      });

      logger.info("Payment intent created", {
        paymentIntentId: paymentIntent.id,
        amount,
      });

      return {
        clientSecret: paymentIntent.client_secret!,
        paymentIntentId: paymentIntent.id,
      };
    } catch (error: any) {
      logger.error("Failed to create payment intent", { error: error.message });
      throw new PaymentFailedError(error.message);
    }
  }

  /**
   * Confirm a payment intent
   */
  async confirmPayment(paymentIntentId: string): Promise<boolean> {
    if (!this.stripe) {
      throw new PaymentFailedError("Payment service not configured");
    }

    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);

      if (paymentIntent.status === "succeeded") {
        await Payment.update(
          { status: "succeeded" },
          { where: { transactionId: paymentIntentId } }
        );
        return true;
      }
      return false;
    } catch (error: any) {
      logger.error("Failed to confirm payment", {
        paymentIntentId,
        error: error.message,
      });
      throw new PaymentFailedError(error.message);
    }
  }

  /**
   * Create a refund
   */
  async createRefund(
    paymentIntentId: string,
    amount?: number,
    reason?: string
  ): Promise<{
    refundId: string;
    amount: number;
    status: string;
  }> {
    if (!this.stripe) {
      throw new PaymentFailedError("Payment service not configured");
    }

    try {
      const refund = await this.stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount: amount ? Math.round(amount * 100) : undefined,
        reason: reason as Stripe.RefundCreateParams.Reason,
      });

      logger.info("Refund created", {
        refundId: refund.id,
        amount: refund.amount / 100,
        status: refund.status,
      });

      // Update DB record
      await Payment.update(
          { status: "refunded" },
          { where: { transactionId: paymentIntentId } }
      );

      return {
        refundId: refund.id,
        amount: refund.amount / 100,
        status: refund.status || "pending",
      };
    } catch (error: any) {
      logger.error("Failed to create refund", {
        paymentIntentId,
        error: error.message,
      });
      throw new PaymentFailedError(`Refund failed: ${error.message}`);
    }
  }

  /**
   * Handle Stripe webhook events
   */
  async handleWebhook(
    payload: Buffer,
    signature: string
  ): Promise<{
    type: string;
    data: any;
  }> {
    if (!this.stripe || !config.stripe.webhookSecret) {
      throw new PaymentFailedError("Webhook not configured");
    }

    try {
      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        config.stripe.webhookSecret
      );

      logger.info("Webhook received", { type: event.type });

      return {
        type: event.type,
        data: event.data.object,
      };
    } catch (error: any) {
      logger.error("Webhook verification failed", { error: error.message });
      throw new PaymentFailedError(`Webhook error: ${error.message}`);
    }
  }

  /**
   * Get payment details
   */
  async getPaymentDetails(paymentIntentId: string) {
    if (!this.stripe) {
      throw new PaymentFailedError("Payment service not configured");
    }

    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);

      return {
        id: paymentIntent.id,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
        metadata: paymentIntent.metadata,
        created: new Date(paymentIntent.created * 1000),
      };
    } catch (error: any) {
      logger.error("Failed to get payment details", {
        paymentIntentId,
        error: error.message,
      });
      throw new PaymentFailedError(error.message);
    }
  }

  /**
   * Check if payment service is available
   */
  isAvailable(): boolean {
    return this.stripe !== null;
  }
}

export const paymentService = new PaymentService();
export default paymentService;
