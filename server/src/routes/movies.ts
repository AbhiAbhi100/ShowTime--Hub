import { Router, Request, Response } from "express";
import { body, validationResult } from "express-validator";
import axios from "axios";
import https from "https";
import { Movie } from "../models";
import { adminOnly, authenticate } from "../middleware/auth";
import config from "../config";
const router = Router();

// Cache for TMDB IP
let cachedTMDBIp: string | null = null;
let lastLookupTime = 0;
const CACHE_TTL = 3600000; // 1 hour

// Helper to resolve TMDB IP via Google (DoH) to bypass ISP DNS issues
const getTMDBIp = async (): Promise<string> => {
  if (cachedTMDBIp && (Date.now() - lastLookupTime < CACHE_TTL)) {
    return cachedTMDBIp;
  }

  try {
    console.log("Resolving TMDB IP via Google DoH...");
    const response = await axios.get("https://dns.google/resolve?name=api.themoviedb.org", {
      timeout: 5000
    });
    
    if (response.data?.Answer) {
      const aRecord = response.data.Answer.find((rec: any) => rec.type === 1);
      if (aRecord?.data) {
        cachedTMDBIp = aRecord.data;
        lastLookupTime = Date.now();
        console.log(`Resolved TMDB IP to: ${cachedTMDBIp}`);
        return cachedTMDBIp!;
      }
    }
    throw new Error("No A record found for TMDB");
  } catch (error: any) {
    console.warn("DoH lookup failed, falling back to system DNS:", error.message);
    return ""; // Empty string signals to use system lookup
  }
};

// Custom agent to use the resolved IP
const tmdbAgent = new https.Agent({
  lookup: (hostname, options: any, callback) => {
    if (hostname === "api.themoviedb.org") {
        getTMDBIp().then((ip) => {
            if (ip) {
                if (options && options.all) {
                    callback(null, [{ address: ip, family: 4 }] as any);
                } else {
                    callback(null, ip, 4);
                }
            } else {
                // Fallback to system lookup
                 import("dns").then(dns => {
                    dns.lookup(hostname, options, callback as any);
                 });
            }
        }).catch((err) => {
            if (options && options.all) {
                callback(err, [] as any);
            } else {
                callback(err, "", 4);
            }
        });
    } else {
        // Fallback for other domains
         import("dns").then(dns => {
             dns.lookup(hostname, options, callback as any);
         });
    }
  },
  family: 4 // Force IPv4
});

/**
 * @swagger
 * tags:
 *   name: Movies
 *   description: Movie management and TMDB integration
 */

const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

// Language code to name mapping
const LANGUAGE_MAP: Record<string, string> = {
  en: "English",
  hi: "Hindi",
  ta: "Tamil",
  te: "Telugu",
  ml: "Malayalam",
  kn: "Kannada",
  bn: "Bengali",
  mr: "Marathi",
  pa: "Punjabi",
  gu: "Gujarati",
  es: "Spanish",
  fr: "French",
  de: "German",
  ja: "Japanese",
  ko: "Korean",
  zh: "Chinese",
};

const INDIAN_LANGUAGES = ["hi", "ta", "te", "ml", "kn", "bn", "mr", "pa", "gu"];

const getLanguageName = (code: string): string => {
  return LANGUAGE_MAP[code] || code?.toUpperCase() || "Unknown";
};

// Helper to fetch movies from TMDB
const fetchTMDBMovies = async (endpoint: string, page: number = 1, category: string = "all") => {
  const apiKey = config.tmdbApiKey;
  if (!apiKey) {
    throw new Error("TMDB_API_KEY is not configured");
  }

  let url: string;

  if (endpoint === "recent") {
    const today = new Date();
    
    // Default: 7 days ago
    let pastDate = new Date();
    pastDate.setDate(today.getDate() - 7);
    
    // For Indian movies: 45 days to ensure we get some movies if 14 days is empty
    if (category === "indian") {
        pastDate = new Date();
        pastDate.setDate(today.getDate() - 45);
    }
    
    const todayStr = today.toISOString().split("T")[0];
    const pastDateStr = pastDate.toISOString().split("T")[0];

    url = `${TMDB_BASE_URL}/discover/movie?api_key=${apiKey}&primary_release_date.gte=${pastDateStr}&primary_release_date.lte=${todayStr}&sort_by=popularity.desc&page=${page}&region=IN`;

    if (category === "indian") {
      // Strict Hindi filter + allow other major Indian langs if needed
      // User said "primarily available in the hindi language"
      // Let's use Hindi (hi) as primary.
      url += `&with_original_language=hi`;
      // Removed vote_count threshold to ensure we show *something* even if new
    } else if (category === "hollywood") {
      url += `&with_original_language=en`;
    }
  } else if (category === "indian") {
    // For Indian movies general browse
    url = `${TMDB_BASE_URL}/discover/movie?api_key=${apiKey}&with_original_language=hi&sort_by=popularity.desc&page=${page}&region=IN`;
  } else if (category === "hollywood") {
    // For Hollywood
    url = `${TMDB_BASE_URL}/discover/movie?api_key=${apiKey}&with_original_language=en&sort_by=popularity.desc&page=${page}`;
  } else {
    // Default endpoints
    url = `${TMDB_BASE_URL}/movie/${endpoint}?api_key=${apiKey}&page=${page}&region=IN`;
  }

  const response = await axios.get(url, { 
    httpsAgent: tmdbAgent,
    timeout: 10000 
  });
  const movies = response.data.results || [];

  return movies.map((movie: any) => ({
    id: String(movie.id),
    title: movie.title,
    poster: movie.poster_path ? `${TMDB_IMAGE_BASE}/w500${movie.poster_path}` : null,
    banner: movie.backdrop_path ? `${TMDB_IMAGE_BASE}/original${movie.backdrop_path}` : null,
    language: getLanguageName(movie.original_language),
    genre: movie.genre_ids || [],
    rating: movie.vote_average ? Math.round(movie.vote_average * 10) / 10 : 0,
    releaseDate: movie.release_date || "",
    description: movie.overview || "",
    isIndian: INDIAN_LANGUAGES.includes(movie.original_language),
  }));
};

// Search movies from TMDB
router.get("/tmdb/search", async (req: Request, res: Response) => {
  try {
    const { query } = req.query;
    const apiKey = config.tmdbApiKey;

    if (!apiKey) {
      return res.status(500).json({ error: "TMDB_API_KEY is not configured" });
    }

    if (!query) {
      return res.status(400).json({ error: "Query parameter is required" });
    }

    const url = `${TMDB_BASE_URL}/search/movie?api_key=${apiKey}&query=${encodeURIComponent(query as string)}&page=1&include_adult=false&region=IN`;
    
    const response = await axios.get(url, { 
        httpsAgent: tmdbAgent,
        timeout: 10000 
    });
    const movies = response.data.results || [];

    const mappedMovies = movies.map((movie: any) => ({
        id: String(movie.id),
        title: movie.title,
        poster: movie.poster_path ? `${TMDB_IMAGE_BASE}/w500${movie.poster_path}` : null,
        banner: movie.backdrop_path ? `${TMDB_IMAGE_BASE}/original${movie.backdrop_path}` : null,
        language: getLanguageName(movie.original_language),
        genre: movie.genre_ids || [],
        rating: movie.vote_average ? Math.round(movie.vote_average * 10) / 10 : 0,
        releaseDate: movie.release_date || "",
        description: movie.overview || "",
        isIndian: INDIAN_LANGUAGES.includes(movie.original_language),
    }));

    res.json(mappedMovies);
  } catch (error: any) {
    console.error("TMDB search error:", error);
    res.status(500).json({ error: error.message || "Failed to search movies" });
  }
});

// Get movies from TMDB
router.get("/tmdb", async (req: Request, res: Response) => {
  try {
    const { endpoint = "upcoming", category = "all" } = req.query;

    const page1 = await fetchTMDBMovies(endpoint as string, 1, category as string);
    const page2 = await fetchTMDBMovies(endpoint as string, 2, category as string);

    const allMovies = [...page1, ...page2];

    // Remove duplicates
    const uniqueMovies = allMovies.filter(
      (movie, index, self) => index === self.findIndex((m) => m.id === movie.id)
    );

    res.json(uniqueMovies);
  } catch (error: any) {
    console.error("TMDB fetch error:", error);
    res.status(500).json({ error: error.message || "Failed to fetch movies from TMDB" });
  }
});

// Get single movie details from TMDB
router.get("/tmdb/:movieId", async (req: Request, res: Response) => {
  try {
    const { movieId } = req.params;
    const apiKey = config.tmdbApiKey;

    if (!apiKey) {
      return res.status(500).json({ error: "TMDB_API_KEY is not configured" });
    }

    const url = `${TMDB_BASE_URL}/movie/${movieId}?api_key=${apiKey}&append_to_response=credits,videos`;
    const response = await axios.get(url, { 
        httpsAgent: tmdbAgent,
        timeout: 10000 
    });
    const movie = response.data;

    const director = movie.credits?.crew?.find((c: any) => c.job === "Director");
    const cast =
      movie.credits?.cast?.slice(0, 8).map((c: any) => ({
        name: c.name,
        character: c.character,
        profile: c.profile_path ? `${TMDB_IMAGE_BASE}/w185${c.profile_path}` : null,
      })) || [];

    const trailer = movie.videos?.results?.find(
      (v: any) => v.type === "Trailer" && v.site === "YouTube"
    );

    const transformedData = {
      id: String(movie.id),
      title: movie.title,
      poster: movie.poster_path ? `${TMDB_IMAGE_BASE}/w500${movie.poster_path}` : null,
      banner: movie.backdrop_path ? `${TMDB_IMAGE_BASE}/original${movie.backdrop_path}` : null,
      language: getLanguageName(movie.original_language),
      genre: movie.genres?.map((g: any) => g.name) || [],
      duration: movie.runtime ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m` : "TBA",
      rating: movie.vote_average ? Math.round(movie.vote_average * 10) / 10 : 0,
      releaseDate: movie.release_date || "",
      description: movie.overview || "",
      cast,
      director: director?.name || "TBA",
      trailer: trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null,
      trailerKey: trailer?.key || null,
      tagline: movie.tagline || "",
      budget: movie.budget || 0,
      revenue: movie.revenue || 0,
      productionCompanies: movie.production_companies?.map((p: any) => p.name) || [],
      isIndian: INDIAN_LANGUAGES.includes(movie.original_language),
    };

    res.json(transformedData);
  } catch (error: any) {
    console.error("TMDB movie details error:", error);
    res.status(500).json({ error: error.message || "Failed to fetch movie details" });
  }
});

// Get all custom movies (from database)
router.get("/custom", async (_req: Request, res: Response) => {
  try {
    const movies = await Movie.findAll({
        where: { isActive: true },
        order: [["createdAt", "DESC"]]
    });
    res.json(movies);
  } catch (error) {
    console.error("Get custom movies error:", error);
    res.status(500).json({ error: "Failed to fetch custom movies" });
  }
});

// Get single custom movie
router.get("/custom/:id", async (req: Request, res: Response) => {
  try {
    const movie = await Movie.findByPk(req.params.id);
    if (!movie) {
      return res.status(404).json({ error: "Movie not found" });
    }
    res.json(movie);
  } catch (error) {
    console.error("Get custom movie error:", error);
    res.status(500).json({ error: "Failed to fetch movie" });
  }
});

// Create custom movie (admin only)
router.post(
  "/custom",
  authenticate,
  adminOnly,
  [
    body("title").trim().notEmpty(),
    body("tmdbId").optional().trim(),
    body("posterUrl").optional().isURL(),
    body("bannerUrl").optional().isURL(),
    body("language").optional().trim(),
    body("genre").optional().isArray(),
    body("duration").optional().trim(),
    body("rating").optional().isFloat({ min: 0, max: 10 }),
    body("releaseDate").optional().trim(),
    body("description").optional().trim(),
    body("director").optional().trim(),
    body("trailerUrl").optional().isURL(),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const movie = await Movie.create(req.body);

      res.status(201).json(movie);
    } catch (error) {
      console.error("Create movie error:", error);
      res.status(500).json({ error: "Failed to create movie" });
    }
  }
);

// Update custom movie (admin only)
router.put("/custom/:id", authenticate, adminOnly, async (req: Request, res: Response) => {
  try {
    const [updatedCount] = await Movie.update(req.body, {
      where: { id: req.params.id }
    });

    if (updatedCount === 0) {
       const exists = await Movie.findByPk(req.params.id);
       if (!exists) return res.status(404).json({ error: "Movie not found" });
    }
    
    const movie = await Movie.findByPk(req.params.id);
    res.json(movie);
  } catch (error) {
    console.error("Update movie error:", error);
    res.status(500).json({ error: "Failed to update movie" });
  }
});

// Delete custom movie (admin only)
router.delete("/custom/:id", authenticate, adminOnly, async (req: Request, res: Response) => {
  try {
    const movie = await Movie.findByPk(req.params.id);

    if (!movie) {
      return res.status(404).json({ error: "Movie not found" });
    }
    
    // Soft delete (logical delete) to avoid foreign key constraints with Shows/Bookings
    // await movie.destroy(); 
    movie.isActive = false;
    movie.status = 'inactive';
    await movie.save();

    res.json({ message: "Movie deleted successfully" });
  } catch (error) {
    console.error("Delete movie error:", error);
    res.status(500).json({ error: "Failed to delete movie" });
  }
});

export default router;
