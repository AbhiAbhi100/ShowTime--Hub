import { Router, Request, Response } from "express";
import { body, validationResult } from "express-validator";
import { User } from "../models";
import { authenticate } from "../middleware/auth";
import { AuthRequest } from "../types";

const router = Router();

// Get current user profile
router.get("/", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated." });
    }

    res.json({
      profile: {
        id: req.user.id,
        email: req.user.email,
        fullName: req.user.fullName,
        phone: req.user.phone, // Ensure User model has phone
        avatarUrl: req.user.avatarUrl, // Ensure User model has avatarUrl
        createdAt: req.user.createdAt,
        updatedAt: req.user.updatedAt,
      },
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ error: "Failed to get profile." });
  }
});

// Update user profile
router.put(
  "/",
  authenticate,
  [
    body("fullName").optional().trim(),
    body("phone").optional().trim(),
    body("avatarUrl").optional().isURL(),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      if (!req.user) {
        return res.status(401).json({ error: "Not authenticated." });
      }

      const { fullName, phone, avatarUrl } = req.body;

      const updateData: any = {};
      if (fullName !== undefined) updateData.fullName = fullName;
      if (phone !== undefined) updateData.phone = phone;
      if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;

      // Update user
      await User.update(updateData, { where: { id: req.user.id } });
      
      const updatedUser = await User.findByPk(req.user.id);

      if (!updatedUser) {
        return res.status(404).json({ error: "User not found." });
      }

      res.json({
        message: "Profile updated successfully",
        profile: {
          id: updatedUser.id,
          email: updatedUser.email,
          fullName: updatedUser.fullName,
          phone: updatedUser.phone,
          avatarUrl: updatedUser.avatarUrl,
          createdAt: updatedUser.createdAt,
          updatedAt: updatedUser.updatedAt,
        },
      });
    } catch (error) {
      console.error("Update profile error:", error);
      res.status(500).json({ error: "Failed to update profile." });
    }
  }
);

// Change password
router.put(
  "/password",
  authenticate,
  [body("currentPassword").exists(), body("newPassword").isLength({ min: 6 })],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      if (!req.user) {
        return res.status(401).json({ error: "Not authenticated." });
      }

      const { currentPassword, newPassword } = req.body;

      // Verify current password
      const user = await User.findByPk(req.user.id);
      if (!user) {
        return res.status(404).json({ error: "User not found." });
      }

      const isValid = await user.comparePassword(currentPassword);
      if (!isValid) {
        return res.status(401).json({ error: "Current password is incorrect." });
      }

      // Update password
      user.password = newPassword;
      await user.save(); // Hook will hash it

      res.json({ message: "Password changed successfully" });
    } catch (error) {
      console.error("Change password error:", error);
      res.status(500).json({ error: "Failed to change password." });
    }
  }
);

export default router;
