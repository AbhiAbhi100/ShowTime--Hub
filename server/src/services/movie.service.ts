import axios from "axios";
import { Movie } from "../models";
import config from "../config";
import logger from "../utils/logger";
import { NotFoundError } from "../utils/errors";
import { Op } from "sequelize";

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

class MovieService {
  private getLanguageName(code: string): string {
    return LANGUAGE_MAP[code] || code?.toUpperCase() || "Unknown";
  }

  /**
   * Fetch movies from TMDB API
   */
  async getTMDBMovies(endpoint: string = "upcoming", category: string = "all"): Promise<any[]> {
    if (!config.tmdbApiKey) {
      logger.error("TMDB API key not configured");
      throw new Error("TMDB_API_KEY is not configured");
    }

    try {
      const movies = await this.fetchTMDBMovies(endpoint, category);
      logger.info(`Fetched ${movies.length} movies from TMDB`, {
        endpoint,
        category,
      });
      return movies;
    } catch (error: any) {
      logger.error("TMDB fetch error", { error: error.message });
      throw error;
    }
  }

  private async fetchTMDBMovies(endpoint: string, category: string): Promise<any[]> {
    let url: string;

    if (category === "indian") {
      const languages = INDIAN_LANGUAGES.join("|");
      url = `${config.tmdbBaseUrl}/discover/movie?api_key=${config.tmdbApiKey}&with_original_language=${languages}&sort_by=popularity.desc&region=IN`;
    } else if (category === "hollywood") {
      url = `${config.tmdbBaseUrl}/discover/movie?api_key=${config.tmdbApiKey}&with_original_language=en&sort_by=popularity.desc`;
    } else {
      url = `${config.tmdbBaseUrl}/movie/${endpoint}?api_key=${config.tmdbApiKey}&region=IN`;
    }

    const [page1, page2] = await Promise.all([
      axios.get(`${url}&page=1`),
      axios.get(`${url}&page=2`),
    ]);

    const allMovies = [...page1.data.results, ...page2.data.results].map((movie: any) => ({
      id: String(movie.id),
      title: movie.title,
      poster: movie.poster_path ? `${config.tmdbImageBase}/w500${movie.poster_path}` : null,
      banner: movie.backdrop_path ? `${config.tmdbImageBase}/original${movie.backdrop_path}` : null,
      language: this.getLanguageName(movie.original_language),
      genre: movie.genre_ids || [],
      rating: movie.vote_average ? Math.round(movie.vote_average * 10) / 10 : 0,
      releaseDate: movie.release_date || "",
      description: movie.overview || "",
      isIndian: INDIAN_LANGUAGES.includes(movie.original_language),
    }));

    // Remove duplicates
    return allMovies.filter(
      (movie, index, self) => index === self.findIndex((m) => m.id === movie.id)
    );
  }

  /**
   * Get single movie details from TMDB
   */
  async getTMDBMovieDetails(movieId: string): Promise<any> {
    if (!config.tmdbApiKey) {
      throw new Error("TMDB_API_KEY is not configured");
    }

    try {
      const url = `${config.tmdbBaseUrl}/movie/${movieId}?api_key=${config.tmdbApiKey}&append_to_response=credits,videos`;
      const response = await axios.get(url);
      const movie = response.data;

      const director = movie.credits?.crew?.find((c: any) => c.job === "Director");
      const cast =
        movie.credits?.cast?.slice(0, 8).map((c: any) => ({
          name: c.name,
          character: c.character,
          profile: c.profile_path ? `${config.tmdbImageBase}/w185${c.profile_path}` : null,
        })) || [];

      const trailer = movie.videos?.results?.find(
        (v: any) => v.type === "Trailer" && v.site === "YouTube"
      );

      return {
        id: String(movie.id),
        title: movie.title,
        poster: movie.poster_path ? `${config.tmdbImageBase}/w500${movie.poster_path}` : null,
        banner: movie.backdrop_path
          ? `${config.tmdbImageBase}/original${movie.backdrop_path}`
          : null,
        language: this.getLanguageName(movie.original_language),
        genre: movie.genres?.map((g: any) => g.name) || [],
        duration: movie.runtime
          ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m`
          : "TBA",
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
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new NotFoundError("Movie");
      }
      throw error;
    }
  }

  /**
   * Get all custom movies from database
   */
  async getCustomMovies(): Promise<Movie[]> {
    const movies = await Movie.findAll({
        where: { isActive: true },
        order: [["createdAt", "DESC"]]
    });
    return movies;
  }

  /**
   * Get single custom movie
   */
  async getCustomMovieById(id: string): Promise<Movie> {
    const movie = await Movie.findByPk(id);
    if (!movie) {
      throw new NotFoundError("Movie");
    }
    return movie;
  }

  /**
   * Create custom movie
   */
  async createCustomMovie(data: Partial<Movie>): Promise<Movie> {
    const movie = await Movie.create(data as any);
    logger.info(`Custom movie created: ${movie.title}`);
    return movie;
  }

  /**
   * Update custom movie
   */
  async updateCustomMovie(id: string, data: Partial<Movie>): Promise<Movie> {
    const [updatedCount] = await Movie.update(data as any, {
      where: { id },
    });
    
    if (updatedCount === 0) {
       // Check if exists to determine if 404
      const exists = await Movie.findByPk(id);
      if (!exists) throw new NotFoundError("Movie");
      return exists; // Return existing if no changes
    }

    const movie = await Movie.findByPk(id);
    if (!movie) {
      throw new NotFoundError("Movie");
    }
    logger.info(`Custom movie updated: ${movie.title}`);
    return movie;
  }

  /**
   * Delete custom movie (soft delete)
   */
  async deleteCustomMovie(id: string): Promise<void> {
    const [updatedCount] = await Movie.update({ isActive: false }, {
        where: { id }
    });
    
    if (updatedCount === 0) {
        const exists = await Movie.findByPk(id);
        if (!exists) throw new NotFoundError("Movie");
    }
    logger.info(`Custom movie deleted: ${id}`);
  }

  /**
   * Fetch and save recent movies (Cron Job)
   */
  async fetchAndSaveRecentMovies(): Promise<void> {
    if (!config.tmdbApiKey) return;

    try {
      const today = new Date();
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(today.getDate() - 7);

      const todayStr = today.toISOString().split("T")[0];
      const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0];
      const languages = INDIAN_LANGUAGES.join("|");

      const url = `${config.tmdbBaseUrl}/discover/movie?api_key=${config.tmdbApiKey}&with_original_language=${languages}&primary_release_date.gte=${sevenDaysAgoStr}&primary_release_date.lte=${todayStr}&region=IN&sort_by=popularity.desc`;

      const response = await axios.get(url);
      const results = response.data.results || [];

      logger.info(`Cron: Found ${results.length} recent Indian movies`);

      let addedCount = 0;
      for (const tmdbMovie of results) {
        // Check if exists
        const exists = await Movie.findOne({ where: { tmdbId: String(tmdbMovie.id) } });
        if (exists) continue;

        // Fetch full details
        try {
          const details = await this.getTMDBMovieDetails(String(tmdbMovie.id));
          
          await Movie.create({
            title: details.title,
            posterUrl: details.poster,
            bannerUrl: details.banner,
            language: details.language,
            genre: details.genre,
            duration: details.duration,
            rating: details.rating,
            releaseDate: new Date(details.releaseDate), // Convert to Date
            description: details.description,
            castMembers: details.cast,
            director: details.director,
            trailerUrl: details.trailer,
            status: "active",
            isActive: true,
            isAutoFetched: true,
            tmdbId: details.id,
            isFeatured: false,
          });
          addedCount++;
        } catch (err: any) {
          logger.error(`Failed to sync movie ${tmdbMovie.title}`, { error: err.message });
        }
      }
      logger.info(`Cron: Added ${addedCount} new movies`);

    } catch (error: any) {
      logger.error("Cron: Movie fetch failed", { error: error.message });
    }
  }

  /**
   * Expire old movies (Cron Job)
   */
  async expireOldMovies(): Promise<void> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [modifiedCount] = await Movie.update(
      { status: "expired" },
      {
        where: {
            status: "active",
            releaseDate: { [Op.lt]: thirtyDaysAgo },
            isAutoFetched: true,
        }
      }
    );
    
    if (modifiedCount > 0) {
      logger.info(`Cron: Expired ${modifiedCount} old movies`);
    }
  }
}

export const movieService = new MovieService();
export default movieService;

