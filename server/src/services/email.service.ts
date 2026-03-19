import nodemailer from "nodemailer";
import config from "../config";
import logger from "../utils/logger";
import { EmailOptions } from "../types";

class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    if (config.smtp.user && config.smtp.pass) {
      this.transporter = nodemailer.createTransport({
        host: config.smtp.host,
        port: config.smtp.port,
        secure: config.smtp.port === 465,
        auth: {
          user: config.smtp.user,
          pass: config.smtp.pass,
        },
      });
    } else {
      logger.warn("SMTP not configured. Email service disabled.");
    }
  }

  /**
   * Send an email
   */
  async send(options: EmailOptions): Promise<boolean> {
    if (!this.transporter) {
      logger.warn("Email service not configured. Skipping email.");
      return false;
    }

    try {
      await this.transporter.sendMail({
        from: config.smtp.from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      logger.info(`Email sent to ${options.to}`, { subject: options.subject });
      return true;
    } catch (error: any) {
      logger.error("Failed to send email", {
        error: error.message,
        to: options.to,
      });
      return false;
    }
  }

  /**
   * Send booking confirmation email
   */
  async sendBookingConfirmation(
    email: string,
    booking: {
      bookingId: string;
      movieTitle: string;
      theatreName: string;
      showDate: string;
      showTime: string;
      seats: string[];
      totalAmount: number;
    }
  ): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .booking-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
          .detail-label { color: #666; }
          .detail-value { font-weight: bold; }
          .total { font-size: 24px; color: #667eea; text-align: center; margin-top: 20px; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎬 Booking Confirmed!</h1>
            <p>Your tickets are ready</p>
          </div>
          <div class="content">
            <div class="booking-details">
              <div class="detail-row">
                <span class="detail-label">Booking ID</span>
                <span class="detail-value">${booking.bookingId}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Movie</span>
                <span class="detail-value">${booking.movieTitle}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Theatre</span>
                <span class="detail-value">${booking.theatreName}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Date & Time</span>
                <span class="detail-value">${booking.showDate} at ${booking.showTime}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Seats</span>
                <span class="detail-value">${booking.seats.join(", ")}</span>
              </div>
            </div>
            <div class="total">
              Total: ₹${booking.totalAmount.toLocaleString()}
            </div>
            <p style="text-align: center; margin-top: 20px;">
              Please arrive 15 minutes before the show time.
            </p>
          </div>
          <div class="footer">
            <p>This is an automated email. Please do not reply.</p>
            <p>© ${new Date().getFullYear()} ShowTime Hub. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.send({
      to: email,
      subject: `🎬 Booking Confirmed - ${booking.movieTitle} | ${booking.bookingId}`,
      html,
      text: `Booking Confirmed!\n\nBooking ID: ${booking.bookingId}\nMovie: ${booking.movieTitle}\nTheatre: ${booking.theatreName}\nDate: ${booking.showDate}\nTime: ${booking.showTime}\nSeats: ${booking.seats.join(", ")}\nTotal: ₹${booking.totalAmount}`,
    });
  }

  /**
   * Send booking cancellation email
   */
  async sendBookingCancellation(
    email: string,
    booking: {
      bookingId: string;
      movieTitle: string;
      refundAmount: number;
    }
  ): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #e74c3c; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Booking Cancelled</h1>
          </div>
          <div class="content">
            <p>Your booking <strong>${booking.bookingId}</strong> for <strong>${booking.movieTitle}</strong> has been cancelled.</p>
            ${booking.refundAmount > 0 ? `<p>A refund of <strong>₹${booking.refundAmount}</strong> will be processed within 5-7 business days.</p>` : "<p>No refund is applicable as per our cancellation policy.</p>"}
          </div>
        </div>
      </body>
      </html>
    `;

    return this.send({
      to: email,
      subject: `Booking Cancelled - ${booking.bookingId}`,
      html,
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordReset(email: string, resetToken: string): Promise<boolean> {
    const resetUrl = `${config.clientUrl}/reset-password?token=${resetToken}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .button { background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Reset Your Password</h1>
          <p>You requested to reset your password. Click the button below to proceed:</p>
          <p><a href="${resetUrl}" class="button">Reset Password</a></p>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request this, please ignore this email.</p>
        </div>
      </body>
      </html>
    `;

    return this.send({
      to: email,
      subject: "Reset Your Password - ShowTime Hub",
      html,
    });
  }
}

export const emailService = new EmailService();
export default emailService;
