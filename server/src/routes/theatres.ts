import { Router, Request, Response } from "express";
import { body, validationResult } from "express-validator";
import { Theatre, City, Screen } from "../models";
import { adminOnly, authenticate } from "../middleware/auth";

const router = Router();

// Get all theatres
router.get("/", async (req: Request, res: Response) => {
  try {
    const { cityId } = req.query;

    const whereClause: any = { isActive: true };
    if (cityId) {
      whereClause.cityId = cityId; // Sequelize uses cityId FK
    }

    const theatres = await Theatre.findAll({
        where: whereClause,
        include: [{ 
            model: City, 
            as: 'city',
            attributes: ['name'],
            where: { isActive: true } // Filter out inactive cities 
        }],
        order: [['name', 'ASC']]
    });

    res.json(theatres);
  } catch (error) {
    console.error("Get theatres error:", error);
    res.status(500).json({ error: "Failed to fetch theatres" });
  }
});

// Get all theatres (admin - including inactive)
router.get("/admin/all", authenticate, adminOnly, async (_req: Request, res: Response) => {
  try {
    const theatres = await Theatre.findAll({
        include: [{ 
            model: City, 
            as: 'city',
            attributes: ['name'] 
        }],
        order: [['name', 'ASC']]
    });

    res.json(theatres);
  } catch (error) {
    console.error("Get all theatres error:", error);
    res.status(500).json({ error: "Failed to fetch theatres" });
  }
});

// Get single theatre
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const theatre = await Theatre.findByPk(req.params.id, {
        include: [{ 
            model: City, 
            as: 'city',
            attributes: ['name'] 
        }]
    });

    if (!theatre) {
      return res.status(404).json({ error: "Theatre not found" });
    }

    res.json(theatre);
  } catch (error) {
    console.error("Get theatre error:", error);
    res.status(500).json({ error: "Failed to fetch theatre" });
  }
});

// Create theatre (admin only)
router.post(
  "/",
  authenticate,
  adminOnly,
  [
    body("name").trim().notEmpty(),
    // body("city").isMongoId(), // No longer MongoId, it's UUID. Could use isUUID or just notEmpty
    body("city").notEmpty(), 
    body("address").optional().trim(),
    body("totalSeats").optional().isInt({ min: 1 }),
    body("amenities").optional().isArray(),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, city, address, amenities, image } = req.body;

      // Verify city exists
      const cityExists = await City.findByPk(city);
      if (!cityExists) {
        return res.status(400).json({ error: "City not found" });
      }

      const theatre = await Theatre.create({
        name,
        cityId: city,
        address,
        amenities,
        image,
      });

      // Auto-create a default screen
      await Screen.create({
        name: "Screen 1",
        theatreId: theatre.id,
        totalSeats: 150, // Default capacity
        seatLayout: { rows: 10, cols: 15 }, // Default layout
        type: "Standard"
      });

      // Reload to populate city
      await theatre.reload({
          include: [{ model: City, as: 'city', attributes: ['name'] }]
      });

      res.status(201).json(theatre);
    } catch (error) {
      console.error("Create theatre error:", error);
      res.status(500).json({ error: "Failed to create theatre" });
    }
  }
);

// Update theatre (admin only)
router.put("/:id", authenticate, adminOnly, async (req: Request, res: Response) => {
  try {
    const [updatedCount] = await Theatre.update(req.body, {
      where: { id: req.params.id },
    });

    if (updatedCount === 0) {
       const exists = await Theatre.findByPk(req.params.id);
       if (!exists) return res.status(404).json({ error: "Theatre not found" });
    }

    const theatre = await Theatre.findByPk(req.params.id, {
        include: [{ 
            model: City, 
            as: 'city',
            attributes: ['name'] 
        }]
    });

    res.json(theatre);
  } catch (error) {
    console.error("Update theatre error:", error);
    res.status(500).json({ error: "Failed to update theatre" });
  }
});

// Delete theatre (admin only)
router.delete("/:id", authenticate, adminOnly, async (req: Request, res: Response) => {
  try {
    const theatre = await Theatre.findByPk(req.params.id);

    if (!theatre) {
      return res.status(404).json({ error: "Theatre not found" });
    }
    
    await theatre.destroy();

    res.json({ message: "Theatre deleted successfully" });
  } catch (error) {
    console.error("Delete theatre error:", error);
    res.status(500).json({ error: "Failed to delete theatre" });
  }
});

export default router;
