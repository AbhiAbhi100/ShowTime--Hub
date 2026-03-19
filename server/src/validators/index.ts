import { body, param, query } from "express-validator";

export const bookingValidators = {
  create: [
    body("movieId").trim().notEmpty().withMessage("Movie ID is required"),
    body("movieTitle").trim().notEmpty().withMessage("Movie title is required"),
    body("moviePoster").optional().isURL().withMessage("Invalid poster URL"),
    body("theatreName").trim().notEmpty().withMessage("Theatre name is required"),
    body("theatreLocation").optional().trim(),
    body("showTime")
      .trim()
      .notEmpty()
      .withMessage("Show time is required")
      .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .withMessage("Invalid time format. Use HH:mm"),
    body("showDate")
      .trim()
      .notEmpty()
      .withMessage("Show date is required")
      .isISO8601()
      .withMessage("Invalid date format. Use YYYY-MM-DD"),
    body("seats").isArray({ min: 1 }).withMessage("At least one seat is required"),
    body("seats.*")
      .isString()
      .matches(/^[A-Z][0-9]+$/)
      .withMessage("Invalid seat format. Use format like A1, B12"),
    body("totalAmount").isFloat({ min: 0 }).withMessage("Total amount must be a positive number"),
    body("showId").optional().isMongoId().withMessage("Invalid show ID"),
  ],

  cancel: [param("id").isMongoId().withMessage("Invalid booking ID")],
};

export const showValidators = {
  create: [
    body("movieId").trim().notEmpty().withMessage("Movie ID is required"),
    body("movieType").isIn(["tmdb", "custom"]).withMessage("Movie type must be 'tmdb' or 'custom'"),
    body("theatre").isMongoId().withMessage("Invalid theatre ID"),
    body("showDate")
      .trim()
      .notEmpty()
      .withMessage("Show date is required")
      .isISO8601()
      .withMessage("Invalid date format. Use YYYY-MM-DD")
      .custom((value) => {
        const date = new Date(value);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (date < today) {
          throw new Error("Show date cannot be in the past");
        }
        return true;
      }),
    body("showTime")
      .trim()
      .notEmpty()
      .withMessage("Show time is required")
      .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .withMessage("Invalid time format. Use HH:mm"),
    body("priceRegular")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("Price must be a positive number"),
    body("pricePremium")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("Price must be a positive number"),
    body("priceVip").optional().isFloat({ min: 0 }).withMessage("Price must be a positive number"),
  ],

  update: [
    param("id").isMongoId().withMessage("Invalid show ID"),
    body("showDate").optional().isISO8601().withMessage("Invalid date format"),
    body("showTime")
      .optional()
      .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .withMessage("Invalid time format"),
    body("priceRegular")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("Price must be a positive number"),
  ],

  getByMovie: [
    param("movieId").trim().notEmpty().withMessage("Movie ID is required"),
    query("date").optional().isISO8601().withMessage("Invalid date format"),
    query("cityId").optional().isMongoId().withMessage("Invalid city ID"),
  ],
};

export const theatreValidators = {
  create: [
    body("name").trim().notEmpty().withMessage("Theatre name is required"),
    body("city").isMongoId().withMessage("Invalid city ID"),
    body("location").trim().notEmpty().withMessage("Location is required"),
    body("totalSeats")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Total seats must be a positive integer"),
    body("amenities").optional().isArray().withMessage("Amenities must be an array"),
  ],

  update: [
    param("id").isMongoId().withMessage("Invalid theatre ID"),
    body("name").optional().trim().notEmpty().withMessage("Name cannot be empty"),
    body("city").optional().isMongoId().withMessage("Invalid city ID"),
  ],
};

export const movieValidators = {
  create: [
    body("title").trim().notEmpty().withMessage("Title is required"),
    body("language").trim().notEmpty().withMessage("Language is required"),
    body("genre").isArray({ min: 1 }).withMessage("At least one genre is required"),
    body("duration")
      .optional()
      .matches(/^\d+h\s?\d*m?$/)
      .withMessage("Invalid duration format. Use format like 2h 30m"),
    body("releaseDate").optional().isISO8601().withMessage("Invalid release date format"),
    body("posterUrl").optional().isURL().withMessage("Invalid poster URL"),
    body("bannerUrl").optional().isURL().withMessage("Invalid banner URL"),
    body("trailerUrl").optional().isURL().withMessage("Invalid trailer URL"),
  ],
};

export const authValidators = {
  register: [
    body("email")
      .trim()
      .notEmpty()
      .withMessage("Email is required")
      .isEmail()
      .withMessage("Invalid email address")
      .normalizeEmail(),
    body("password")
      .notEmpty()
      .withMessage("Password is required")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters")
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage(
        "Password must contain at least one uppercase letter, one lowercase letter, and one number"
      ),
    body("fullName")
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage("Name must be between 2 and 100 characters"),
  ],

  login: [
    body("email")
      .trim()
      .notEmpty()
      .withMessage("Email is required")
      .isEmail()
      .withMessage("Invalid email address")
      .normalizeEmail(),
    body("password").notEmpty().withMessage("Password is required"),
  ],

  changePassword: [
    body("currentPassword").notEmpty().withMessage("Current password is required"),
    body("newPassword")
      .notEmpty()
      .withMessage("New password is required")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters")
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage(
        "Password must contain at least one uppercase letter, one lowercase letter, and one number"
      ),
  ],
};

export const paginationValidators = [
  query("page").optional().isInt({ min: 1 }).withMessage("Page must be a positive integer"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),
  query("sortBy").optional().trim(),
  query("sortOrder")
    .optional()
    .isIn(["asc", "desc"])
    .withMessage("Sort order must be 'asc' or 'desc'"),
];
