import { Router, Request, Response } from "express";
import { body, validationResult } from "express-validator";
import { City } from "../models";
import { adminOnly, authenticate } from "../middleware/auth";
import { Op } from "sequelize";

const router = Router();

// Get all active cities (public)
router.get("/", async (req: Request, res: Response) => {
  try {
    const { all } = req.query;
    // If all=true is passed (for admin), return all cities including inactive
    const whereClause: any = all === "true" ? {} : { isActive: true };
    
    const cities = await City.findAll({
        where: whereClause,
        order: [['name', 'ASC']]
    });

    // Prevent caching of city list
    res.set("Cache-Control", "no-store, no-cache, must-revalidate");
    res.json(cities);
  } catch (error) {
    console.error("Get cities error:", error);
    res.status(500).json({ error: "Failed to fetch cities" });
  }
});

// Get single city
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const city = await City.findByPk(req.params.id);
    if (!city) {
      return res.status(404).json({ error: "City not found" });
    }
    res.json(city);
  } catch (error) {
    console.error("Get city error:", error);
    res.status(500).json({ error: "Failed to fetch city" });
  }
});

// Create city (admin only)
router.post(
  "/",
  authenticate,
  adminOnly,
  [
    body("name").trim().notEmpty(),
    body("code").trim().notEmpty(),
    body("state").optional().trim(),
    body("icon").optional().trim()
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, code, state, icon } = req.body;

      // Check if city already exists (case insensitive)
      const existingCity = await City.findOne({
        where: { 
            name: { [Op.like]: name } // Simple like for loose match, or use explicit lower case check if DB supports
        }
      });
      
      if (existingCity) {
        return res.status(400).json({ error: "City already exists" });
      }

      const city = await City.create({ name, code, state, icon });
      
      res.status(201).json(city);
    } catch (error) {
      console.error("Create city error:", error);
      res.status(500).json({ error: "Failed to create city" });
    }
  }
);

// Update city (admin only)
router.put("/:id", authenticate, adminOnly, async (req: Request, res: Response) => {
  try {
    const [updatedCount] = await City.update(req.body, {
      where: { id: req.params.id }
    });

    if (updatedCount === 0) {
        const exists = await City.findByPk(req.params.id);
        if (!exists) return res.status(404).json({ error: "City not found" });
    }
    
    const city = await City.findByPk(req.params.id);
    res.json(city);
  } catch (error) {
    console.error("Update city error:", error);
    res.status(500).json({ error: "Failed to update city" });
  }
});

// Delete city (admin only)
router.delete("/:id", authenticate, adminOnly, async (req: Request, res: Response) => {
  try {
    const city = await City.findByPk(req.params.id);

    if (!city) {
      return res.status(404).json({ error: "City not found" });
    }
    
    // Soft delete using Sequelize paranoid mode
    await city.destroy();

    res.json({ message: "City deleted successfully" });
  } catch (error) {
    console.error("Delete city error:", error);
    res.status(500).json({ error: "Failed to delete city", details: error instanceof Error ? error.message : "Unknown error" });
  }
});

export default router;
