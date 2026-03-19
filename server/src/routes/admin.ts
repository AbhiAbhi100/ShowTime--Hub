import { Router, Request, Response } from "express";
import { body, validationResult, param } from "express-validator";
import { Booking, User, Theatre, Show, Movie, City, FeaturedMovie, Screen } from "../models";
import { generateToken, adminOnly, authenticate } from "../middleware/auth";
import { AuthRequest } from "../types";
import { validateRequest } from "../middleware/common";
import { adminService } from "../services/admin.service";
import { NotFoundError } from "../utils/errors";
import sequelize from "../config/database";
import { Op } from "sequelize";

const router = Router();

// Admin login
router.post(
  "/login",
  [body("email").isEmail().normalizeEmail(), body("password").exists()],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;

      // Check User model
      const user = await User.findOne({ where: { email } });
      if (!user) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      // Check for admin privileges
      if (user.role !== "admin" && user.role !== "super_admin" as any) { // roles usually just 'user' | 'admin' based on User model, check if super_admin is supported
         return res.status(403).json({ error: "Access denied. Not an admin." });
      }

      const isValidPassword = await user.comparePassword(password);
      if (!isValidPassword) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      const token = generateToken(user.id, "admin");

      res.json({
        message: "Admin login successful",
        admin: {
          id: user.id,
          email: user.email,
          isSuperAdmin: user.role === "super_admin" as any, 
          fullName: user.fullName
        },
        token,
      });
    } catch (error) {
      console.error("Admin login error:", error);
      res.status(500).json({ error: "Failed to login" });
    }
  }
);

// Get admin profile
router.get("/me", authenticate, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    res.json({
      admin: {
        id: req.user.id,
        email: req.user.email,
        isSuperAdmin: (req.user.role === "super_admin" as any),
        fullName: req.user.fullName
      },
    });
  } catch (error) {
    console.error("Get admin error:", error);
    res.status(500).json({ error: "Failed to get admin" });
  }
});

// Dashboard stats
router.get("/dashboard/stats", authenticate, adminOnly, async (_req: Request, res: Response) => {
  try {
    const [
      totalBookings,
      totalUsers,
      totalTheatres,
      totalShows,
      totalMovies,
      totalCities,
      recentBookings,
      revenue,
    ] = await Promise.all([
      Booking.count(),
      User.count(),
      Theatre.count(),
      Show.count(),
      Movie.count(),
      City.count(),
      Booking.findAll({
        order: [['createdAt', 'DESC']],
        limit: 10,
        attributes: ["bookingId", "movieTitle", "totalAmount", "status", "createdAt"]
      }),
      Booking.sum('totalAmount', { where: { status: "confirmed" } })
    ]);

    res.json({
      stats: {
        totalBookings,
        totalUsers,
        totalTheatres,
        totalShows,
        totalMovies,
        totalCities,
        totalRevenue: revenue || 0,
      },
      recentBookings,
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({ error: "Failed to fetch dashboard stats" });
  }
});

// Get all bookings (admin)
router.get("/bookings", authenticate, adminOnly, async (req: Request, res: Response) => {
  try {
    const { status, limit = 50, page = 1 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (status) where.status = status;

    const { rows: bookings, count: total } = await Booking.findAndCountAll({
      where,
       include: [{ model: User, as: "user", attributes: ["email", "fullName"] }],
       order: [['createdAt', 'DESC']],
       limit: Number(limit),
       offset,
    });

    res.json({
      bookings,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error("Get admin bookings error:", error);
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
});

// Get all users (admin)
router.get("/users", authenticate, adminOnly, async (req: Request, res: Response) => {
  try {
    const { limit = 50, page = 1 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const { rows: users, count: total } = await User.findAndCountAll({
      order: [['createdAt', 'DESC']],
      limit: Number(limit),
      offset,
      attributes: { exclude: ["password"] }
    });

    res.json({
      users,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error("Get admin users error:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// Create new admin (super admin only)
// Note: Requires User model to support 'super_admin' or we just use 'admin' role.
// The previous code had IsSuperAdmin logic on a separate Admin model. 
// For now, we allow creating new 'admin' users if the requester is an admin.
// Real super_admin logic would need a role update or check.
router.post(
  "/create",
  authenticate,
  adminOnly,
  [
    body("email").isEmail().normalizeEmail(),
    body("password").isLength({ min: 6 }),
    body("fullName").optional().isString(),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      // Simplification: Any admin can create another admin for now
      // Or check if req.user.role === 'super_admin'

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password, fullName } = req.body;

      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ error: "User with this email already exists" });
      }

      const admin = await User.create({
        email,
        password, // Hook will hash
        fullName,
        role: "admin"
      });

      res.status(201).json({
        message: "Admin created successfully",
        admin: {
          id: admin.id,
          email: admin.email,
          role: admin.role,
        },
      });
    } catch (error) {
      console.error("Create admin error:", error);
      res.status(500).json({ error: "Failed to create admin" });
    }
  }
);

// Get featured movies
router.get("/featured-movies", async (_req: Request, res: Response) => {
  try {
    const movies = await FeaturedMovie.findAll({
      where: { isActive: true },
      order: [
        ['displayOrder', 'ASC'],
        ['createdAt', 'DESC']
      ]
    });
    res.json(movies);
  } catch (error) {
    console.error("Get featured movies error:", error);
    res.status(500).json({ error: "Failed to fetch featured movies" });
  }
});

// Add featured movie (admin only)
router.post(
  "/featured-movies",
  authenticate,
  adminOnly,
  [
    body("movieId").notEmpty(),
    body("movieType").isIn(["tmdb", "custom"]),
    body("title").notEmpty(),
    body("poster").notEmpty(),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { movieId, movieType, title, poster, displayOrder } = req.body;

      // Check if already exists
      const existing = await FeaturedMovie.findOne({ where: { movieId, movieType } });
      if (existing) {
        return res.status(400).json({ error: "Movie is already featured" });
      }

      const featuredMovie = await FeaturedMovie.create({
        movieId,
        movieType,
        title,
        poster,
        displayOrder: displayOrder || 0,
        isActive: true
      });

      res.status(201).json(featuredMovie);
    } catch (error) {
      console.error("Add featured movie error:", error);
      res.status(500).json({ error: "Failed to add featured movie" });
    }
  }
);

// Remove featured movie (admin only)
router.delete("/featured-movies/:id", authenticate, adminOnly, async (req: Request, res: Response) => {
  try {
    const result = await FeaturedMovie.destroy({ where: { id: req.params.id } });
    if (!result) {
      return res.status(404).json({ error: "Featured movie not found" });
    }
    res.json({ message: "Featured movie removed successfully" });
  } catch (error) {
    console.error("Remove featured movie error:", error);
    res.status(500).json({ error: "Failed to remove featured movie" });
  }
});

// Update featured movie order (admin only)
router.put("/featured-movies/:id", authenticate, adminOnly, async (req: Request, res: Response) => {
  try {
    const [updated] = await FeaturedMovie.update(req.body, { where: { id: req.params.id } });
    if (!updated) {
      return res.status(404).json({ error: "Featured movie not found" });
    }
    const movie = await FeaturedMovie.findByPk(req.params.id);
    res.json(movie);
  } catch (error) {
    console.error("Update featured movie error:", error);
    res.status(500).json({ error: "Failed to update featured movie" });
  }
});

// --- NEW ROUTES MERGED FROM Admin Features ---

/**
 * @route   POST /api/admin/theatres
 * @desc    Create a new theatre (optionally with screens)
 */
router.post(
  "/theatres",
  authenticate, adminOnly, // Apply middleware explicitly
  [
    body("name").notEmpty().withMessage("Name is required"),
    body("city").notEmpty().withMessage("City ID is required"),
    body("screens").optional().isArray(),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    const theatre = await adminService.createTheatre(req.body);
    res.status(201).send(theatre);
  }
);

/**
 * @route   POST /api/admin/theatres/:id/screens
 * @desc    Add a screen to a theatre
 */
router.post(
  "/theatres/:id/screens",
  authenticate, adminOnly,
  [
    param("id").isUUID().withMessage("Invalid Theatre ID"), // Changed isMongoId to isUUID
    body("name").notEmpty().withMessage("Screen Name is required"),
    body("seatLayout").notEmpty().withMessage("Seat Layout is required"),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    const screen = await adminService.addScreen(req.params.id, req.body);
    res.status(201).send(screen);
  }
);

/**
 * @route   POST /api/admin/shows/generate
 * @desc    Batch generate shows
 */
router.post(
  "/shows/generate",
  authenticate, adminOnly,
  [
    body("movieId").notEmpty().withMessage("Movie ID Required"), // Removing isMongoId
    body("theatreId").isUUID().withMessage("Theatre ID Required"),
    body("screenIds").isArray({ min: 1 }).withMessage("At least one Screen ID required"),
    body("fromDate").isISO8601().withMessage("Valid From Date required"),
    body("toDate").isISO8601().withMessage("Valid To Date required"),
    body("showTimes").isArray({ min: 1 }).withMessage("Show times required"),
    body("priceConfig").isObject().withMessage("Price config required"),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    const shows = await adminService.generateShows(req.body);
    res.status(201).send({ message: "Shows generated successfully", count: shows.length });
  }
);

/**
 * @route   PATCH /api/admin/movies/:id/status
 * @desc    Update movie status (active/inactive)
 */
router.patch(
  "/movies/:id/status",
  authenticate, adminOnly,
  [
    param("id").exists(),
    body("status").isIn(["active", "inactive", "expired"]),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    const [updated] = await Movie.update(
      { isActive: req.body.status === "active" }, // status field might not exist in Movie model, inferred from isActive
      { where: { id: req.params.id }}
    );
     
    if (!updated) throw new NotFoundError("Movie");
    
    const movie = await Movie.findByPk(req.params.id);
    res.send(movie);
  }
);

/**
 * @route   POST /api/admin/cities
 * @desc    Add a new city
 */
router.post(
  "/cities",
  authenticate, adminOnly,
  [body("name").notEmpty(), body("code").notEmpty()],
  validateRequest,
  async (req: Request, res: Response) => {
    const city = await City.create(req.body);
    res.status(201).send(city);
  }
);

export default router;
