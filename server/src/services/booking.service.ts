import { Booking, Show, User } from "../models";
import { CreateBookingDTO, BookingResult, PaginatedResult } from "../types";
import {
  NotFoundError,
  SeatAlreadyBookedError,
  BadRequestError,
  ConflictError,
} from "../utils/errors";
import { generateBookingId, getPaginationMeta } from "../utils/helpers";
import logger from "../utils/logger";
import sequelize from "../config/database";
import { Op, Transaction } from "sequelize";

// Check if we're in test environment
const isTestEnv = process.env.NODE_ENV === "test" || process.env.VITEST;

class BookingService {
  /**
   * Create a new booking with atomic transaction
   */
  async createBooking(userId: string, dto: CreateBookingDTO): Promise<BookingResult> {
    const t = await sequelize.transaction();

    try {
      const result = await this.executeBookingLogic(userId, dto, t);
      await t.commit();
      return result;
    } catch (error) {
      await t.rollback();
      logger.error("Booking creation failed", {
        error,
        userId,
        dto,
      });
      throw error;
    }
  }

  private async executeBookingLogic(
    userId: string,
    dto: CreateBookingDTO,
    t: Transaction
  ): Promise<BookingResult> {
    const bookingId = generateBookingId();

    // If showId is provided, handle seat booking atomically
    if (dto.showId) {
      // Lock the show row
      const show = await Show.findByPk(dto.showId, { 
          transaction: t,
          lock: true,
          skipLocked: false
      });

      if (!show) {
        throw new NotFoundError("Show");
      }

      if (!show.isActive) {
        throw new BadRequestError("Show is no longer available for booking");
      }

      // Check for already booked seats
      const currentBookedSeats = show.bookedSeatIds || [];
      const alreadyBooked = dto.seats.filter((seat: string) => currentBookedSeats.includes(seat));

      if (alreadyBooked.length > 0) {
        throw new SeatAlreadyBookedError(alreadyBooked);
      }

      // Update show with booked seats
      const newBookedSeats = [...currentBookedSeats, ...dto.seats];
      show.bookedSeatIds = newBookedSeats;
      show.availableSeats = show.availableSeats - dto.seats.length;
      
      await show.save({ transaction: t });
    }

    // Create booking
    const booking = await Booking.create({
      bookingId,
      userId: userId,
      movieId: dto.movieId,
      movieTitle: dto.movieTitle,
      moviePoster: dto.moviePoster,
      theatreName: dto.theatreName,
      theatreLocation: dto.theatreLocation,
      showTime: dto.showTime,
      showDate: dto.showDate, 
      seats: dto.seats,
      totalAmount: dto.totalAmount,
      showId: dto.showId || null,
      status: "confirmed",
    }, { transaction: t });

    logger.info(`Booking created: ${bookingId}`, {
      userId,
      movieId: dto.movieId,
      seats: dto.seats.length,
    });

    return {
      bookingId,
      status: "confirmed",
      seats: dto.seats,
      totalAmount: dto.totalAmount,
    };
  }

  /**
   * Get user's bookings with pagination
   */
  async getUserBookings(
    userId: string,
    page: number,
    limit: number
  ): Promise<PaginatedResult<Booking>> {
    const offset = (page - 1) * limit;

    const { rows: bookings, count: total } = await Booking.findAndCountAll({
        where: { userId: userId },
        order: [['createdAt', 'DESC']],
        limit,
        offset,
    });

    return {
      data: bookings,
      meta: getPaginationMeta(page, limit, total),
    };
  }

  /**
   * Get booking by ID
   */
  async getBookingById(bookingId: string, userId: string): Promise<Booking> {
    const booking = await Booking.findOne({
      where: {
          id: bookingId,
          userId: userId,
      }
    });

    if (!booking) {
      throw new NotFoundError("Booking");
    }

    return booking;
  }

  /**
   * Get booking by reference ID
   */
  async getBookingByRef(refId: string, userId: string): Promise<Booking> {
    const booking = await Booking.findOne({
      where: {
          bookingId: refId,
          userId: userId,
      }
    });

    if (!booking) {
      throw new NotFoundError("Booking");
    }

    return booking;
  }

  /**
   * Cancel booking with refund handling
   */
  async cancelBooking(
    bookingId: string,
    userId: string
  ): Promise<{ success: boolean; refundAmount?: number }> {
    const t = await sequelize.transaction();

    try {
      const result = await this.executeCancelLogic(bookingId, userId, t);
      await t.commit();
      return result;
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  private async executeCancelLogic(
    bookingId: string,
    userId: string,
    t: Transaction
  ): Promise<{ success: boolean; refundAmount?: number }> {
    const booking = await Booking.findOne({
        where: { id: bookingId, userId: userId },
        transaction: t,
        lock: true
    });

    if (!booking) {
      throw new NotFoundError("Booking");
    }

    if (booking.status === "cancelled") {
      throw new BadRequestError("Booking is already cancelled");
    }

    // Check if show date has passed
    const showDate = new Date(booking.showDate);
    const now = new Date();
    if (showDate < now) {
      throw new BadRequestError("Cannot cancel past bookings");
    }

    // Calculate refund based on cancellation policy
    const hoursUntilShow = (showDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    let refundPercentage = 0;

    if (hoursUntilShow > 24) {
      refundPercentage = 100;
    } else if (hoursUntilShow > 4) {
      refundPercentage = 50;
    } else {
      refundPercentage = 0;
    }

    const refundAmount = (booking.totalAmount * refundPercentage) / 100;

    // Release seats back to show
    if (booking.showId) {
      const show = await Show.findByPk(booking.showId, { transaction: t, lock: true });
      if (show) {
          const booked = show.bookedSeatIds || [];
          const seatsToRelease = booking.seats || [];
          const newBooked = booked.filter(s => !seatsToRelease.includes(s));
          
          show.bookedSeatIds = newBooked;
          show.availableSeats = (show.availableSeats || 0) + seatsToRelease.length;
          await show.save({ transaction: t });
      }
    }

    // Update booking status
    booking.status = "cancelled";
    await booking.save({ transaction: t });

    logger.info(`Booking cancelled: ${booking.bookingId}`, {
      userId,
      refundAmount,
      refundPercentage,
    });

    return { success: true, refundAmount };
  }

  /**
   * Get all bookings (admin)
   */
  async getAllBookings(
    page: number,
    limit: number,
    filters?: { status?: string; startDate?: string; endDate?: string }
  ): Promise<PaginatedResult<Booking>> {
    const offset = (page - 1) * limit;
    const where: any = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.startDate || filters?.endDate) {
      const dateFilter: any = {};
      if (filters.startDate) {
        dateFilter[Op.gte] = filters.startDate;
      }
      if (filters.endDate) {
        dateFilter[Op.lte] = filters.endDate;
      }
      where.showDate = dateFilter;
    }

    const { rows: bookings, count: total } = await Booking.findAndCountAll({
        where,
        include: [{ model: User, as: 'user', attributes: ['email', 'fullName'] }],
        order: [['createdAt', 'DESC']],
        limit,
        offset,
    });

    return {
      data: bookings,
      meta: getPaginationMeta(page, limit, total),
    };
  }

  /**
   * Get booking statistics
   */
  async getBookingStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const totalBookings = await Booking.count();
    const todayBookings = await Booking.count({
        where: { createdAt: { [Op.gte]: today } }
    });

    const totalRevenue = await Booking.sum('totalAmount', {
        where: { status: 'confirmed' }
    });

    const todayRevenue = await Booking.sum('totalAmount', {
        where: { 
            status: 'confirmed',
            createdAt: { [Op.gte]: today }
        }
    });
    
    // Status counts
    const statusCountsData = await Booking.findAll({
        attributes: ['status', [sequelize.fn('COUNT', sequelize.col('status')), 'count']],
        group: ['status']
    });
    
    // Convert to object
    const statusCounts: Record<string, number> = {};
    statusCountsData.forEach((item: any) => {
        statusCounts[item.status] = parseInt(item.getDataValue('count'), 10);
    });

    return {
      totalBookings,
      todayBookings,
      totalRevenue: totalRevenue || 0,
      todayRevenue: todayRevenue || 0,
      statusCounts
    };
  }
}

export const bookingService = new BookingService();
export default bookingService;
