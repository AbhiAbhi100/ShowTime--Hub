import { Show, Theatre, Screen, City, Movie } from "../models";
import { CreateShowDTO, PaginatedResult } from "../types";
import { NotFoundError, BadRequestError, ConflictError } from "../utils/errors";
import { getPaginationMeta, isFutureDate } from "../utils/helpers";
import logger from "../utils/logger";
import { movieService } from "./movie.service";
import sequelize from "../config/database";
import { Op } from "sequelize";

class ShowService {
  /**
   * Get shows for a movie
   */
  async getShowsForMovie(movieId: string, date?: string, cityId?: string): Promise<Show[]> {
    const where: any = { movieId, isActive: true };

    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0,0,0,0);
      const endDate = new Date(date);
      endDate.setHours(23,59,59,999);
      
      where.showDate = {
        [Op.gte]: startDate,
        [Op.lte]: endDate
      };
    } else {
      where.showDate = { [Op.gte]: new Date() };
    }

    let include: any[] = [
      {
        model: Theatre,
        as: "theatre",
        include: [{ model: City, as: "city", attributes: ["name"] }]
      },
      { model: Screen, as: "screen" }
    ];

    if (cityId) {
        // Evaluate if we can filter by city in query or post-process
        // Sequelize filtering on nested includes is possible but syntax varies
        // Easiest is to filter in memory if dataset is small, or use required: true
        include[0].required = true;
        include[0].where = { cityId }; 
    }

    let shows = await Show.findAll({
      where,
      include,
      order: [['showDate', 'ASC'], ['showTime', 'ASC']]
    });

    // Auto-generate if empty
    if (shows.length === 0 && date) {
        const dateStr = String(date).split("T")[0]; 
        await this.ensureMockShowsForMovie(movieId, dateStr, cityId);

        // Re-fetch
        shows = await Show.findAll({
          where,
          include,
          order: [['showDate', 'ASC'], ['showTime', 'ASC']]
        });
    }

    return shows;
  }

  /**
   * Get shows for a theatre
   */
  async getShowsForTheatre(theatreId: string, date?: string): Promise<Show[]> {
    const where: any = { theatreId, isActive: true };

    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0,0,0,0);
      const endDate = new Date(date);
      endDate.setHours(23,59,59,999);
      where.showDate = { [Op.gte]: startDate, [Op.lte]: endDate };
    } else {
      where.showDate = { [Op.gte]: new Date() };
    }

    const results = await Show.findAll({
      where,
      include: [
        { model: Theatre, as: "theatre" },
        { model: Screen, as: "screen" }
      ],
      order: [['showDate', 'ASC'], ['showTime', 'ASC']]
    });
    return results;
  }

  /**
   * Get single show with details
   */
  async getShowById(id: string): Promise<Show> {
    const show = await Show.findByPk(id, {
      include: [
        {
          model: Theatre,
          as: "theatre",
          include: [{ model: City, as: "city", attributes: ["name"] }]
        },
        { model: Screen, as: "screen" }
      ]
    });

    if (!show) {
      throw new NotFoundError("Show");
    }

    return show;
  }

  /**
   * Get all shows (admin)
   */
  async getAllShows(
    page: number,
    limit: number,
    filters?: { theatreId?: string; movieId?: string; date?: string }
  ): Promise<PaginatedResult<Show>> {
    const offset = (page - 1) * limit;
    const where: any = {};

    if (filters?.theatreId) {
      where.theatreId = filters.theatreId;
    }
    if (filters?.movieId) {
      where.movieId = filters.movieId;
    }
    if (filters?.date) {
      const d = new Date(filters.date);
      const nextDay = new Date(d);
      nextDay.setDate(d.getDate() + 1);
      
      where.showDate = {
        [Op.gte]: d,
        [Op.lt]: nextDay
      };
    }

    const { rows: shows, count: total } = await Show.findAndCountAll({
        where,
        include: [
          {
            model: Theatre,
            as: "theatre",
            include: [{ model: City, as: "city", attributes: ["name"] }]
          },
          { model: Screen, as: "screen" }
        ],
        order: [['showDate', 'DESC'], ['showTime', 'ASC']],
        limit,
        offset
    });

    return {
      data: shows,
      meta: getPaginationMeta(page, limit, total),
    };
  }

  /**
   * Create a new show
   */
  async createShow(dto: any): Promise<Show> {
    // Validate theatre exists
    const theatre = await Theatre.findByPk(dto.theatre); // dto.theatre might be ID
    if (!theatre) {
      throw new NotFoundError("Theatre");
    }

    // Validate screen exists
    const screen = await Screen.findOne({ where: { id: dto.screen, theatreId: dto.theatre } });
    if (!screen) {
      throw new NotFoundError("Screen not found in this theatre");
    }

    const dateObj = new Date(dto.showDate);
    if(isNaN(dateObj.getTime())) throw new BadRequestError("Invalid Show Date");

    // Check for duplicate show on SAME SCREEN
    const existingShow = await Show.findOne({
      where: {
        theatreId: dto.theatre,
        screenId: dto.screen,
        showDate: dto.showDate, // DateOnly matching
        showTime: dto.showTime, 
        isActive: true,
      }
    });

    if (existingShow) {
      throw new ConflictError("A show already exists for this screen at the same time");
    }

    const totalSeats = (screen.seatLayout as any)?.rows * (screen.seatLayout as any)?.cols || 100;

    const show = await Show.create({
      movieId: dto.movieId,
      theatreId: dto.theatre,
      screenId: dto.screen,
      showDate: dto.showDate,
      showTime: dto.showTime,
      prices: dto.prices,
      totalSeats,
      availableSeats: totalSeats,
      bookedSeatIds: [],
      isActive: true,
      movieType: dto.movieType || "tmdb"
    });

    // Fetch with includes to return
    const createdShow = await Show.findByPk(show.id, {
        include: [
            {
                model: Theatre,
                as: "theatre",
                include: [{ model: City, as: "city", attributes: ["name"] }]
            },
            { model: Screen, as: "screen" }
        ]
    });

    logger.info(`Show created for movie ${dto.movieId}`);
    return createdShow!;
  }

  /**
   * Update show
   */
  async updateShow(id: string, data: any): Promise<Show> {
    const show = await Show.findByPk(id);
    if (!show) {
      throw new NotFoundError("Show");
    }

    // Don't allow changing date/time if seats are booked
    if ((data.showDate || data.showTime) && (show.bookedSeatIds?.length || 0) > 0) {
      throw new BadRequestError("Cannot change show time/date after seats are booked");
    }

    await show.update(data);
    
    // Fetch refreshed
    return this.getShowById(id);
  }

  /**
   * Delete show (soft delete)
   */
  async deleteShow(id: string): Promise<void> {
    const show = await Show.findByPk(id);
    if (!show) {
      throw new NotFoundError("Show");
    }

    if ((show.bookedSeatIds?.length || 0) > 0) {
      throw new BadRequestError(
        "Cannot delete show with existing bookings. Cancel bookings first."
      );
    }

    show.isActive = false;
    await show.save();

    logger.info(`Show deleted: ${id}`);
  }

  /**
   * Get available seats for a show
   */
  async getAvailableSeats(showId: string): Promise<{
    totalSeats: number;
    bookedSeats: string[];
    availableCount: number;
    seatLayout: any;
  }> {
    const show = await Show.findByPk(showId, {
        include: [{ model: Screen, as: "screen" }]
    });

    if (!show) {
      throw new NotFoundError("Show");
    }

    const screen = show.screen;
    if (!screen) throw new NotFoundError("Screen data missing for show");

    return {
      totalSeats: show.totalSeats,
      bookedSeats: show.bookedSeatIds || [],
      availableCount: show.availableSeats,
      seatLayout: screen.seatLayout
    };
  }

  /**
   * Get show statistics
   */
  async getShowStats() {
    const today = new Date();
    today.setHours(0,0,0,0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const [totalShows, todayShows, upcomingShows] = await Promise.all([
      Show.count({ where: { isActive: true } }),
      Show.count({ 
          where: { 
              isActive: true, 
              showDate: { [Op.gte]: today, [Op.lt]: tomorrow } 
          } 
      }),
      Show.count({ 
          where: { 
              isActive: true, 
              showDate: { [Op.gt]: tomorrow } 
          } 
      }),
    ]);

    return {
      totalShows,
      todayShows,
      upcomingShows,
    };
  }

  /**
   * Ensure mock shows exist for a movie (For Demo/Dev)
   */
  async ensureMockShowsForMovie(movieId: string, dateStr: string, cityId?: string): Promise<void> {
    try {
      const showCheck: any = { movieId: movieId, showDate: dateStr };
      if (cityId) {
         // This requires finding theatres in city first
         const theatres = await Theatre.findAll({ where: { cityId } });
         if (theatres.length > 0) {
             showCheck.theatreId = { [Op.in]: theatres.map(t => t.id) };
         } else {
             // City has no theatres, so no shows can match
             // But we might create one later
         }
      }
      
      const existingShows = await Show.findOne({ where: showCheck });
      if (existingShows) return;

      logger.info(`Generating mock shows for movie ${movieId} on ${dateStr}`);

      let movieDoc = await Movie.findOne({ where: { tmdbId: movieId } });
      
      if (!movieDoc) {
          movieDoc = await Movie.findByPk(movieId);
      }

      if (!movieDoc) {
          try {
              const details = await movieService.getTMDBMovieDetails(movieId);
              movieDoc = await Movie.create({
                title: details.title,
                posterUrl: details.poster,
                bannerUrl: details.banner,
                language: details.language,
                genre: details.genre,
                duration: details.duration,
                rating: details.rating,
                releaseDate: new Date(details.releaseDate),
                description: details.description,
                castMembers: details.cast,
                director: details.director,
                trailerUrl: details.trailer,
                status: "active",
                isActive: true,
                isAutoFetched: true,
                tmdbId: details.id
              });
          } catch (e: any) {
             logger.error(`Failed to sync movie ${movieId}: ${e.message}`);
             // Fallback
             movieDoc = await Movie.create({
                title: `Movie ${movieId}`,
                posterUrl: null,
                bannerUrl: null, // nullable?
                language: "Unknown",
                genre: [],
                duration: "2h 0m",
                rating: 0,
                releaseDate: new Date(),
                description: "Auto-generated",
                castMembers: [],
                director: "Unknown",
                status: "active",
                isActive: true,
                isAutoFetched: false,
                tmdbId: movieId
             });
          }
      }

      let theatres: Theatre[] = [];
      const theatreWhere: any = { isActive: true };

      if (cityId) {
        theatreWhere.cityId = cityId;
        theatres = await Theatre.findAll({ where: theatreWhere, limit: 5 });

        if (theatres.length === 0) {
           const city = await City.findByPk(cityId);
           if (city) {
              const newTheatre = await Theatre.create({
                name: `Cinemax - ${city.name}`,
                cityId: cityId,
                address: `123 Main St, ${city.name}`,
                amenities: ["Dolby Atmos", "4K", "Food Court"],
                isActive: true
              });
              
              const newScreen = await Screen.create({
                 theatreId: newTheatre.id,
                 name: "Screen 1",
                 type: "IMAX",
                 seatLayout: { rows: 10, cols: 15, aisles: [] },
                 isActive: true
              });
              
              theatres = [newTheatre];
           }
        }
      } else {
         theatres = await Theatre.findAll({ where: theatreWhere, limit: 5 });
      }

      if (theatres.length === 0) return;

      const showTimes = ["10:00", "13:30", "16:45", "20:15", "23:00"];
      const prices = {
        "Standard": 180,
        "Premium": 250,
        "VIP": 400
      };

      for (const theatre of theatres) {
         let screen = await Screen.findOne({ where: { theatreId: theatre.id } });
         if (!screen) {
            screen = await Screen.create({
                 theatreId: theatre.id,
                 name: "Screen 1",
                 type: "Standard",
                 seatLayout: { rows: 8, cols: 12, aisles: [] },
                 isActive: true
            });
         }

         const selectedTimes = showTimes.sort(() => 0.5 - Math.random()).slice(0, 3);
         
         const rows = (screen.seatLayout as any)?.rows || 10;
         const cols = (screen.seatLayout as any)?.cols || 10;

         for (const time of selectedTimes) {
            try {
              await Show.create({
                movieId: movieDoc!.id,
                theatreId: theatre.id,
                screenId: screen.id,
                showDate: dateStr, 
                showTime: time,
                prices,
                totalSeats: rows * cols,
                availableSeats: rows * cols,
                bookedSeatIds: [],
                isActive: true,
                movieType: "tmdb"
              });
            } catch (err: any) {
              // Ignore duplicates
            }
         }
      }

    } catch (error) {
       logger.error(`Failed to generate mock shows: ${error}`);
    }
  }
}

export const showService = new ShowService();
export default showService;
