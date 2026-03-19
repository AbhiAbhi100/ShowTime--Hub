import { Router, Request, Response } from "express";
import { body, validationResult } from "express-validator";
import { Booking, Show, SeatLock } from "../models";
import { authenticate } from "../middleware/auth";
import { AuthRequest } from "../types";
import sequelize from "../config/database";
import { Op } from "sequelize";

const router = Router();

// Get user's bookings
router.get("/", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const bookings = await Booking.findAll({
        where: { userId: req.user.id },
        order: [["createdAt", "DESC"]]
    });

    res.json(bookings);
  } catch (error) {
    console.error("Get bookings error:", error);
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
});

// Get single booking
router.get("/:id", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const booking = await Booking.findOne({
      where: {
          id: req.params.id,
          userId: req.user.id,
      }
    });

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    res.json(booking);
  } catch (error) {
    console.error("Get booking error:", error);
    res.status(500).json({ error: "Failed to fetch booking" });
  }
});

// Get booking by booking ID
router.get("/ref/:bookingId", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const booking = await Booking.findOne({
      where: {
          bookingId: req.params.bookingId,
          userId: req.user.id,
      }
    });

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    res.json(booking);
  } catch (error) {
    console.error("Get booking by ref error:", error);
    res.status(500).json({ error: "Failed to fetch booking" });
  }
});

// Basic in-memory cache for idempotency (in production Use Redis)
import NodeCache from "node-cache";
const idempotencyCache = new NodeCache({ stdTTL: 600 }); // 10 minutes

// Create booking with atomic seat locking to handle concurrent bookings
router.post(
  "/",
  authenticate,
  [
    body("movieId").trim().notEmpty(),
    body("movieTitle").trim().notEmpty(),
    body("moviePoster").optional(),
    body("theatreName").trim().notEmpty(),
    body("theatreLocation").optional(),
    body("showTime").trim().notEmpty(),
    body("showDate").trim().notEmpty(),
    body("seats").isArray({ min: 1 }),
    body("totalAmount").isFloat({ min: 0 }),
    body("showId").notEmpty().withMessage("Show ID is required"),
  ],
  async (req: AuthRequest, res: Response) => {
    // 1. Idempotency Check
    const idempotencyKey = req.headers['idempotency-key'] as string;
    if (idempotencyKey) {
        const cachedResponse = idempotencyCache.get(idempotencyKey);
        if (cachedResponse) {
            console.log(`[Idempotency] Returning cached response for key: ${idempotencyKey}`);
            return res.status(201).json(cachedResponse);
        }
    }

    const t = await sequelize.transaction();
    
    try {
      console.log("--> RAW INCOMING REQUEST BODY:", JSON.stringify(req.body));
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        await t.rollback();
        console.log("--> VALIDATION ERRORS:", errors.array());
        return res.status(400).json({ errors: errors.array() });
      }

      if (!req.user) {
        await t.rollback();
        return res.status(401).json({ error: "Not authenticated" });
      }

      const {
        movieId,
        movieTitle,
        moviePoster,
        theatreName,
        theatreLocation,
        showTime,
        showDate,
        seats,
        totalAmount,
        showId,
      } = req.body;

      console.log("Booking request:", { movieId, movieTitle, showId, seats });
      
      const fs = require('fs');
      const path = require('path');
      const logPath = path.join(__dirname, '../../debug.log');
      fs.appendFileSync(logPath, `[${new Date().toISOString()}] REQUEST: ${JSON.stringify(req.body)}\n`);
      console.log("--> INCOMING BOOKING REQUEST:", JSON.stringify(req.body));

      // Check if seats are available
      if (showId) {
          // Lock the show row for update
          const show = await Show.findByPk(showId, {
              transaction: t,
              lock: true, 
              skipLocked: false
          });
          
          if (!show) {
              await t.rollback();
              console.error(`[Booking] Show not found: ${showId}`);
              return res.status(404).json({ error: "Show not found" });
          }
          
          if (!show.isActive) {
              await t.rollback();
              console.error(`[Booking] Show is inactive: ${showId}`);
              return res.status(400).json({ error: "This show is no longer available" });
          }

          // Check for conflicts with existing bookings
          const booked = show.bookedSeatIds || [];
          const bookedConflicts = seats.filter((s: string) => booked.includes(s));
          
          if (bookedConflicts.length > 0) {
              await t.rollback();
              console.error(`[Booking] Seats already booked: ${bookedConflicts.join(", ")}`);
               return res.status(409).json({
                error: `Seats already booked: ${bookedConflicts.join(", ")}. Please select different seats.`,
                conflictedSeats: bookedConflicts,
              });
          }

          // Check for conflicts with locks (held by others)
          const activeLocks = await SeatLock.findAll({
              where: {
                  showId,
                  seatId: { [Op.in]: seats },
                  userId: { [Op.ne]: req.user.id }, // Locks by others
                  expiresAt: { [Op.gt]: new Date() }
              },
              transaction: t
          });

          if (activeLocks.length > 0) {
              await t.rollback();
              const lockedSeats = activeLocks.map(l => l.seatId);
              console.error(`[Booking] Seats locked by others: ${lockedSeats.join(", ")}`);
              return res.status(409).json({
                  error: `Seats are temporarily reserved by other users: ${lockedSeats.join(", ")}.`,
                  conflictedSeats: lockedSeats
              });
          }
          
          // Update show seats
          show.bookedSeatIds = [...booked, ...seats];
          show.availableSeats = show.availableSeats - seats.length;
          await show.save({ transaction: t });

          // Remove MY locks for these seats (since they are now booked)
          await SeatLock.destroy({
              where: {
                  showId,
                  seatId: { [Op.in]: seats },
                  userId: req.user.id
              },
              transaction: t
          });
      }

      // Generate booking ID with random suffix to ensure uniqueness
      const bookingId = `BK${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 100)}`;

      // Create booking
      const booking = await Booking.create({
        bookingId,
        userId: req.user.id,
        movieId: String(movieId),
        movieTitle,
        moviePoster,
        theatreName,
        theatreLocation,
        showTime,
        showDate,
        seats,
        totalAmount,
        status: "confirmed",
        showId: showId || null,
      }, { transaction: t });

      await t.commit();

      console.log("Booking created:", bookingId);
      
      const responsePayload = {
        message: "Booking confirmed",
        bookingId,
        booking,
      };

      // Cache the successful response
      if (idempotencyKey) {
          idempotencyCache.set(idempotencyKey, responsePayload);
      }

      res.status(201).json(responsePayload);
    } catch (error: any) {
      await t.rollback();
      console.error("Create booking error:", error.message, error.stack);
      
      const fs = require('fs');
      const path = require('path');
      const logPath = path.join(__dirname, '../../debug.log');
      fs.appendFileSync(logPath, `[${new Date().toISOString()}] ERROR: ${error.message} - ${error.stack}\n`);
      
      // If error is due to unique constraint on bookingId (rare battle condition), retry?
      // For now just error out.
      res.status(500).json({ error: "Failed to create booking: " + error.message });
    }
  }
);

// Cancel booking
router.put("/:id/cancel", authenticate, async (req: AuthRequest, res: Response) => {
  const t = await sequelize.transaction();
  try {
    if (!req.user) {
      await t.rollback();
      return res.status(401).json({ error: "Not authenticated" });
    }

    const booking = await Booking.findOne({
      where: {
          id: req.params.id,
          userId: req.user.id,
      },
      transaction: t
    });

    if (!booking) {
      await t.rollback();
      return res.status(404).json({ error: "Booking not found" });
    }

    if (booking.status === "cancelled") {
      await t.rollback();
      return res.status(400).json({ error: "Booking is already cancelled" });
    }

    // If there's a show reference, remove the booked seats
    if (booking.showId) {
      const show = await Show.findByPk(booking.showId, { transaction: t, lock: true });
      if (show) {
        show.bookedSeatIds = show.bookedSeatIds.filter((seat: string) => !booking.seats.includes(seat));
        show.availableSeats = (show.availableSeats || 0) + booking.seats.length;
        await show.save({ transaction: t });
      }
    }

    booking.status = "cancelled";
    await booking.save({ transaction: t });

    await t.commit();

    res.json({ message: "Booking cancelled successfully", booking });
  } catch (error) {
    await t.rollback();
    console.error("Cancel booking error:", error);
    res.status(500).json({ error: "Failed to cancel booking" });
  }
});

export default router;
