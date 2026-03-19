import cron from "node-cron";
import logger from "../utils/logger";
import { movieService } from "../services/movie.service";
import { Booking, Show } from "../models";
import { Op } from "sequelize";
import sequelize from "../config/database";

// Helper to log job start/end
const runJob = async (name: string, job: () => Promise<void>) => {
  logger.info(`Job started: ${name}`);
  try {
    await job();
    logger.info(`Job completed: ${name}`);
  } catch (error: any) {
    logger.error(`Job failed: ${name}`, { error: error.message });
  }
};

export const initCronJobs = () => {
  logger.info("Initializing Cron Jobs...");

  // 1. Movie Auto-Fetcher: Run every day at 00:00
  cron.schedule("0 0 * * *", () => {
    runJob("Movie Auto-Fetcher", async () => {
      await movieService.fetchAndSaveRecentMovies();
      await movieService.expireOldMovies();
    });
  });

  // 1.5 Show Cleanup: Run every day at 01:00 AM
  cron.schedule("0 1 * * *", () => {
    runJob("Show Cleanup", async () => {
       const today = new Date();
       today.setHours(0, 0, 0, 0);
       const retentionDate = new Date(today);
       retentionDate.setDate(today.getDate() - 7);
       
       const formattedDate = retentionDate.toISOString().split('T')[0];
       
       const deleted = await Show.destroy({
           where: {
               showDate: { [Op.lt]: formattedDate }
           }
       });
       
       logger.info(`Auto-cleaned ${deleted} old shows`);
    });
  });

  // 2. Booking Cleanup: Run every 5 minutes
  // Release seats for bookings that are 'pending' for > 10 minutes
  cron.schedule("*/5 * * * *", () => {
    runJob("Booking Cleanup", async () => {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      
      const expiredBookings = await Booking.findAll({
        where: {
            status: "pending",
            createdAt: { [Op.lt]: tenMinutesAgo },
        }
      });

      if (expiredBookings.length > 0) {
        logger.info(`Found ${expiredBookings.length} expired bookings to clean up`);
        
        for (const booking of expiredBookings) {
          const t = await sequelize.transaction();
          
          try {
              booking.status = "cancelled";
              await booking.save({ transaction: t });

              // Release seats
              if (booking.showId && booking.seats && booking.seats.length > 0) {
                const show = await Show.findByPk(booking.showId, { transaction: t, lock: true });
                
                if (show) {
                    // Remove booked seats
                    const seatsToRelease = booking.seats as string[];
                    show.bookedSeatIds = show.bookedSeatIds.filter((seat: string) => !seatsToRelease.includes(seat));
                    show.availableSeats = show.availableSeats + seatsToRelease.length;
                    
                    await show.save({ transaction: t });
                }
              }
              
              await t.commit();
              logger.info(`Cleaned up booking ${booking.id}`);
          } catch (err: any) {
              await t.rollback();
              logger.error(`Failed to clean up booking ${booking.id}`, { error: err.message });
          }
        }
      }
    });
  });

  logger.info("Cron Jobs Scheduled");
};
