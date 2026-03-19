import { Router, Request, Response } from "express";
import { body, validationResult } from "express-validator";
import { Show, Theatre, City, Screen, Movie, SeatLock, Booking } from "../models";
import { adminOnly, authenticate } from "../middleware/auth";
import { Op } from "sequelize";
import { AuthRequest } from "../types";

const router = Router();

// ... (existing code)

// Get single show with booked seats and locks
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const show = await Show.findByPk(req.params.id, {
        include: [
          { 
            model: Theatre, 
            as: 'theatre',
            include: [{ model: City, as: 'city', attributes: ['name'] }]
          },
          {
            model: Screen,
            as: 'screen'
          }
        ]
    });

    if (!show) {
      return res.status(404).json({ error: "Show not found" });
    }

    // Fetch active seat locks
    const locks = await SeatLock.findAll({
      where: {
        showId: show.id,
        expiresAt: { [Op.gt]: new Date() } // Expires in future
      },
      attributes: ['seatId']
    });

    const lockedSeatIds = locks.map(l => l.seatId);
    
    // Combine booked and locked seats for response
    // Logic: Frontend usually sees "booked" as unavailable.
    // We can merge them here or send separately.
    // Sending separately gives frontend more flexible display options.
    const responseData = {
        ...show.toJSON(),
        lockedSeatIds
    };

    res.json(responseData);
  } catch (error) {
    console.error("Get show error:", error);
    res.status(500).json({ error: "Failed to fetch show" });
  }
});

// Get shows for a movie
router.get("/movie/:movieId", async (req: Request, res: Response) => {
  try {
    const { movieId } = req.params;
    const { date, cityId } = req.query;

    let targetMovieId = movieId;

    // Check if movieId is numeric (likely TMDB ID)
    if (/^\d+$/.test(movieId)) {
        const movie = await Movie.findOne({ where: { tmdbId: movieId } });
        if (movie) {
            targetMovieId = movie.id;
        } else {
             // If we can't find it by TMDB ID, and it's numeric, it might not exist in our DB yet.
             // But let's return [] instead of failing, as per current logic.
             // OR, if it's not found, maybe we should return 404? 
             // For now, let's just let it fall through with the TMDB ID (which won't match UUID) -> returns []
             console.log(`[Shows API] TMDB ID ${movieId} not found in DB.`);
        }
    }

    const whereClause: any = { movieId: targetMovieId, isActive: true };

    if (date) {
      // Normalize date to YYYY-MM-DD format
      const dateStr = String(date).split("T")[0];
      whereClause.showDate = dateStr;
    }

    // Theatre filter logic
    const theatreInclude: any = {
        model: Theatre,
        as: 'theatre',
        where: { isActive: true },
        include: [{ 
            model: City, 
            as: 'city', 
            attributes: ['name', 'state'],
            where: { isActive: true }
        }]
    };

    if (cityId) {
        // Filter by city ID via association
        theatreInclude.where.cityId = cityId;
    }

    const shows = await Show.findAll({
        where: whereClause,
        include: [
            theatreInclude,
            { 
                model: Screen, 
                as: 'screen',
                attributes: ['id', 'name', 'seatLayout', 'totalSeats'] // Explicitly fetch layout
            } 
        ],
        order: [['showTime', 'ASC']]
    });

    // Log for debugging (remove in production)
    console.log(`[Shows API] movieId=${movieId}, date=${date}, cityId=${cityId}, found=${shows.length} shows`);

    res.json(shows);
  } catch (error) {
    console.error("Get shows error:", error);
    res.status(500).json({ error: "Failed to fetch shows" });
  }
});

// Debug endpoint - Get all shows
router.get("/debug/all", async (_req: Request, res: Response) => {
  try {
    const shows = await Show.findAll({
        include: [{ 
            model: Theatre, 
            as: 'theatre',
            include: [{ model: City, as: 'city', attributes: ['name', 'state'] }]
        }],
        order: [['showDate', 'ASC'], ['showTime', 'ASC']],
        limit: 50
    });

    const summary = {
      totalShows: shows.length,
      shows: shows.map((s: any) => ({
        id: s.id,
        movieId: s.movieId,
        movieType: s.movieType,
        showDate: s.showDate,
        showTime: s.showTime,
        isActive: s.isActive,
        theatre: s.theatre ? {
          id: s.theatre.id,
          name: s.theatre.name,
          city: s.theatre.city?.name || "No city",
        } : "Theatre not found",
      })),
    };

    res.json(summary);
  } catch (error) {
    console.error("Debug shows error:", error);
    res.status(500).json({ error: "Failed to fetch shows" });
  }
});

// Get shows for a theatre
router.get("/theatre/:theatreId", async (req: Request, res: Response) => {
  try {
    const { theatreId } = req.params;
    const { date } = req.query;

    const whereClause: any = { theatreId, isActive: true };

    if (date) {
      whereClause.showDate = date;
    }

    const shows = await Show.findAll({
        where: whereClause,
        include: [{ model: Theatre, as: 'theatre' }],
        order: [['showDate', 'ASC'], ['showTime', 'ASC']]
    });

    res.json(shows);
  } catch (error) {
    console.error("Get theatre shows error:", error);
    res.status(500).json({ error: "Failed to fetch shows" });
  }
});

// Get single show with booked seats
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const show = await Show.findByPk(req.params.id, {
        include: [{ 
            model: Theatre, 
            as: 'theatre',
            include: [{ model: City, as: 'city', attributes: ['name'] }]
        }]
    });

    if (!show) {
      return res.status(404).json({ error: "Show not found" });
    }

    res.json(show);
  } catch (error) {
    console.error("Get show error:", error);
    res.status(500).json({ error: "Failed to fetch show" });
  }
});

// Cleanup old shows (admin only)
router.post("/admin/cleanup", authenticate, adminOnly, async (_req: Request, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Retention policy: Keep the last 7 days. Delete anything older.
    const retentionDate = new Date(today);
    retentionDate.setDate(today.getDate() - 7);
    
    const offset = retentionDate.getTimezoneOffset();
    const localDate = new Date(retentionDate.getTime() - (offset * 60000));
    const formattedDate = localDate.toISOString().split('T')[0];

    // Find the shows to delete first
    const showsToDelete = await Show.findAll({
      where: {
        showDate: {
            [Op.lt]: formattedDate
        }
      },
      attributes: ['id']
    });

    const showIds = showsToDelete.map(s => s.id);

    let deletedCount = 0;
    if (showIds.length > 0) {
      // Delete child records first to avoid foreign key constraints
      await SeatLock.destroy({ where: { showId: { [Op.in]: showIds } } });
      await Booking.destroy({ where: { showId: { [Op.in]: showIds } } });

      deletedCount = await Show.destroy({
        where: {
          id: {
              [Op.in]: showIds
          }
        }
      });
    }

    res.json({ message: `Cleanup successful. Deleted ${deletedCount} old shows.` });
  } catch (error) {
    console.error("Cleanup shows error:", error);
    res.status(500).json({ error: "Failed to cleanup old shows" });
  }
});

// Seed shows (admin only) - Auto-schedule for next 7 days
router.post("/admin/seed", authenticate, adminOnly, async (_req: Request, res: Response) => {
  try {
    const today = new Date();
    const numberOfDays = 7;
    let createdCount = 0;

    // 1. Fetch active movies (limit to top 20 to include more options)
    const movies = await Movie.findAll({
        where: { isActive: true }, // Add condition if needed
        limit: 20
    });

    if (movies.length === 0) {
        return res.status(400).json({ error: "No active movies found to seed." });
    }

    // 2. Fetch all theatres & screens
    const theatres = await Theatre.findAll({
        where: { isActive: true },
        include: [{ model: Screen, as: 'screens' }]
    });

    if (theatres.length === 0) {
        return res.status(400).json({ error: "No active theatres found." });
    }

    // 3. Generate shows
    // Show times: 10am, 1pm, 4pm, 7pm, 10pm
    const showTimes = ["10:00", "13:00", "16:00", "19:00", "22:00"];

    for (let i = 0; i < numberOfDays; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() + i);
        const offset = date.getTimezoneOffset();
        const localDate = new Date(date.getTime() - (offset * 60000));
        const dateStr = localDate.toISOString().split('T')[0];

        for (const theatre of theatres) {
            // @ts-ignore
            const screens = theatre.screens || [];
            if (screens.length === 0) continue;

            for (const screen of screens) {
                 // For each time slot, pick a random movie
                 for (const time of showTimes) {
                     // Check if show exists
                     const existing = await Show.findOne({
                         where: {
                             theatreId: theatre.id,
                             screenId: screen.id,
                             showDate: dateStr,
                             showTime: time
                         }
                     });

                     if (!existing) {
                         // Pick random movie
                         const randomMovie = movies[Math.floor(Math.random() * movies.length)];
                         
                         await Show.create({
                             movieId: randomMovie.id,
                             theatreId: theatre.id,
                             screenId: screen.id,
                             showDate: dateStr,
                             showTime: time,
                             totalSeats: screen.totalSeats,
                             availableSeats: screen.totalSeats,
                             prices: {
                                 "Regular": 150,
                                 "Premium": 250,
                                 "VIP": 400
                             },
                             isActive: true
                         });
                         createdCount++;
                     }
                 }
            }
        }
    }

    res.json({ message: `Seeding complete. Created ${createdCount} new shows.` });

  } catch (error: any) {
    console.error("Seed shows error:", error);
    res.status(500).json({ error: "Failed to seed shows: " + error.message });
  }
});

// Get all shows (admin)
router.get("/admin/all", authenticate, adminOnly, async (_req: Request, res: Response) => {
  try {
    const shows = await Show.findAll({
        include: [{ 
            model: Theatre, 
            as: 'theatre',
            include: [{ model: City, as: 'city', attributes: ['name'] }]
        },
        {
            model: Movie,
            as: 'movie',
            attributes: ['title']
        }],
        order: [['showDate', 'DESC'], ['showTime', 'ASC']]
    });

    res.json(shows);
  } catch (error) {
    console.error("Get all shows error:", error);
    res.status(500).json({ error: "Failed to fetch shows" });
  }
});

// Create show (admin only)
router.post(
  "/",
  authenticate,
  adminOnly,
  [
    body("movieId").trim().notEmpty(),
    body("movieType").optional().isIn(["tmdb", "custom"]),
    body("theatre").notEmpty(), // Assuming theatre ID
    body("showDate").trim().notEmpty(),
    body("showTime").trim().notEmpty(),
    body("priceRegular").optional().isFloat({ min: 0 }),
    body("pricePremium").optional().isFloat({ min: 0 }),
    body("priceVip").optional().isFloat({ min: 0 }),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        movieId,
        movieType,
        theatre,
        showDate,
        showTime,
        priceRegular,
        pricePremium,
        priceVip,
        screenId // Optional, but preferred
      } = req.body;

      // Verify theatre exists
      const theatreDoc = await Theatre.findByPk(theatre, {
          include: [{ model: City, as: 'city', attributes: ['name'] }]
      });
      if (!theatreDoc) {
        return res.status(400).json({ error: "Theatre not found" });
      }
      
      // Determine Screen
      let targetScreenId = screenId;
      let totalSeats = 0;
      
      const allScreens = await Screen.findAll({ where: { theatreId: theatre } });
      
      if (targetScreenId) {
          const screen = allScreens.find(s => s.id === targetScreenId);
          if (!screen) {
              return res.status(400).json({ error: "Screen not found in this theatre" });
          }
          totalSeats = screen.totalSeats;
      } else {
          // Fallback to first screen
          if (allScreens.length > 0) {
              targetScreenId = allScreens[0].id;
              totalSeats = allScreens[0].totalSeats;
          } else {
              return res.status(400).json({ error: "Theatre has no screens. Cannot create show." });
          }
      }

      // Check for duplicate show (only screenId, showDate, and showTime define uniqueness)
      const existingShow = await Show.findOne({
          where: {
            screenId: targetScreenId,
            showDate,
            showTime,
          }
      });

      if (existingShow) {
        return res.status(400).json({ error: "Show already exists for this time slot on this screen" });
      }

      // Construct prices object
      const prices = {
        Regular: priceRegular || 0,
        Premium: pricePremium || 0,
        VIP: priceVip || 0
      };

      const show = await Show.create({
        movieId,
        theatreId: theatre,
        screenId: targetScreenId,
        showDate,
        showTime,
        prices,
        totalSeats: totalSeats,
        availableSeats: totalSeats,
      });

      await show.reload({
          include: [{ 
            model: Theatre, 
            as: 'theatre',
            include: [{ model: City, as: 'city', attributes: ['name'] }]
        }]
      });

      res.status(201).json(show);
    } catch (error: any) {
      require('fs').writeFileSync('/app/my_error.log', JSON.stringify({ message: error.message, stack: error.stack }, null, 2));
      console.error("Create show error:", error);
      res.status(500).json({ error: "Failed to create show" });
    }
  }
);

// Update show (admin only)
router.put("/:id", authenticate, adminOnly, async (req: Request, res: Response) => {
  try {
    const { priceRegular, pricePremium, priceVip, movieType, ...otherData } = req.body;
    
    // If prices are provided in the update, construct the JSON
    let updateData: any = { ...otherData };
    if (priceRegular !== undefined || pricePremium !== undefined || priceVip !== undefined) {
         // We need to be careful not to overwrite existing prices if only one is passed, 
         // but for simplicity assuming full update or fetch-modify-save pattern.
         // Better to merge with existing if possible, but let's assume full payload for now 
         // or just default to 0 if missing in this specific payload context (Admin form usually sends all).
         updateData.prices = {
            Regular: priceRegular || 0,
            Premium: pricePremium || 0,
            VIP: priceVip || 0
         };
    }

    const [updatedCount] = await Show.update(updateData, {
      where: { id: req.params.id }
    });

    if (updatedCount === 0) {
        const exists = await Show.findByPk(req.params.id);
        if (!exists) return res.status(404).json({ error: "Show not found" });
    }

    const show = await Show.findByPk(req.params.id, {
        include: [{ 
            model: Theatre, 
            as: 'theatre',
            include: [{ model: City, as: 'city', attributes: ['name'] }]
        }]
    });

    res.json(show);
  } catch (error) {
    console.error("Update show error:", error);
    res.status(500).json({ error: "Failed to update show" });
  }
});

// Delete show (admin only)
router.delete("/:id", authenticate, adminOnly, async (req: Request, res: Response) => {
  try {
    const show = await Show.findByPk(req.params.id);

    if (!show) {
      return res.status(404).json({ error: "Show not found" });
    }
    
    await show.destroy();

    res.json({ message: "Show deleted successfully" });
  } catch (error) {
    console.error("Delete show error:", error);
    res.status(500).json({ error: "Failed to delete show" });
  }
});

// Lock seats (temporary)
router.post(
  "/:id/lock",
  authenticate,
  [
    body("seats").isArray({ min: 1 }),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Not authenticated" });
      
      const { seats } = req.body; // ["A1", "A2"]
      const showId = req.params.id;

      const show = await Show.findByPk(showId);
      if (!show) return res.status(404).json({ error: "Show not found" });

      // 1. Check if seats are already booked
      const booked = show.bookedSeatIds || [];
      const bookedConflicts = seats.filter((s: string) => booked.includes(s));
      if (bookedConflicts.length > 0) {
        return res.status(409).json({ error: "One or more seats are already booked", conflicts: bookedConflicts });
      }

      // 2. Check if locked by OTHERS
      const activeLocks = await SeatLock.findAll({
        where: {
          showId,
          expiresAt: { [Op.gt]: new Date() },
          seatId: { [Op.in]: seats },
          userId: { [Op.ne]: req.user.id } // Ignore my own locks
        }
      });

      if (activeLocks.length > 0) {
         const lockedSeats = activeLocks.map(l => l.seatId);
         return res.status(409).json({ error: "One or more seats are temporarily reserved by others", conflicts: lockedSeats });
      }

      // 3. Create Locks (upsert or delete old keys for this user + insert new)
      // Expiration: 10 minutes
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

      // Delete any existing locks for these seats (they could be expired locks or the user's previous locks) to prevent unique constraint violation
      await SeatLock.destroy({
        where: {
          showId,
          seatId: { [Op.in]: seats }
        }
      });

      // Use transaction ideally, but for now parallel Promise.all is okay
      await Promise.all(seats.map((seatId: string) => {
         return SeatLock.create({
            showId,
            seatId,
            userId: req.user!.id,
            lockedAt: new Date(),
            expiresAt
         });
      }));

      res.json({ message: "Seats locked successfully", expiresAt });

    } catch (error) {
       console.error("Lock seats error:", error);
       res.status(500).json({ error: "Failed to lock seats" });
    }
  }
);

// Unlock seats
router.post(
  "/:id/unlock",
  authenticate,
  [
    body("seats").isArray({ min: 1 }),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
       if (!req.user) return res.status(401).json({ error: "Not authenticated" });
       
       const { seats } = req.body;
       const showId = req.params.id;

       await SeatLock.destroy({
           where: {
               showId,
               seatId: { [Op.in]: seats },
               userId: req.user.id
           }
       });

       res.json({ message: "Seats unlocked" });
    } catch (error) {
        console.error("Unlock seats error:", error);
        res.status(500).json({ error: "Failed to unlock seats" });
    }
  }
);

export default router;
