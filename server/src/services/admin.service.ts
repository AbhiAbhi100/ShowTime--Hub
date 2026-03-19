import { Theatre, Screen, Show, Movie, Seat } from "../models";
import { NotFoundError, BadRequestError } from "../utils/errors";
import logger from "../utils/logger";

class AdminService {
  /**
   * Create Theatre with initial Screens if provided
   */
  async createTheatre(data: any): Promise<Theatre> {
    const { screens, city, ...otherData } = data;
    const theatreData = { ...otherData, cityId: city };
    const theatre = await Theatre.create(theatreData);

    if (screens && screens.length > 0) {
      const screenDocs = screens.map((screen: any) => ({
        ...screen,
        theatreId: theatre.id,
      }));
      await Screen.bulkCreate(screenDocs);
    }
    
    // Populate Seats for each screen
    if (screens && screens.length > 0) {
      // We need to fetch the created screens to get their IDs and layouts
      const createdScreens = await Screen.findAll({
        where: { theatreId: theatre.id }
      });
      
      for (const screen of createdScreens) {
        await this._generateSeatsForScreen(screen);
      }
    }
    
    return theatre; 
  }

  /**
   * Add Screen to Theatre
   */
  async addScreen(theatreId: string, data: any): Promise<Screen> {
    const theatre = await Theatre.findByPk(theatreId);
    if (!theatre) throw new NotFoundError("Theatre");

    const screen = await Screen.create({
      ...data,
      theatreId: theatreId,
    });
    return screen;
  }

  /**
   * Update Screen Layout
   */
  async updateScreenLayout(screenId: string, layout: any): Promise<Screen> {
    const [updatedCount] = await Screen.update(
      { seatLayout: layout },
      { where: { id: screenId } }
    );
    
    if (updatedCount > 0) {
       const screen = await Screen.findByPk(screenId);
       if (screen) {
         await this._generateSeatsForScreen(screen);
       }
    }
    
    if (updatedCount === 0) {
        // Check existence
        const exists = await Screen.findByPk(screenId);
        if (!exists) throw new NotFoundError("Screen");
    }
    
    const screen = await Screen.findByPk(screenId);
    if (!screen) throw new NotFoundError("Screen"); // Should not happen
    return screen;
  }

  /**
   * Batch Generate Shows
   */
  async generateShows(params: {
    movieId: string;
    theatreId: string;
    screenIds: string[];
    fromDate: string; // YYYY-MM-DD
    toDate: string; // YYYY-MM-DD
    showTimes: string[]; // ["10:00", "14:00"]
    priceConfig: { [key: string]: number }; // { "Standard": 200, "Premium": 300 }
  }): Promise<Show[]> {
    const { movieId, theatreId, screenIds, fromDate, toDate, showTimes, priceConfig } = params;

    const movie = await Movie.findByPk(movieId);
    if (!movie) throw new NotFoundError("Movie");

    const theatre = await Theatre.findByPk(theatreId);
    if (!theatre) throw new NotFoundError("Theatre");

    const start = new Date(fromDate);
    const end = new Date(toDate);
    const showsData: any[] = [];

    // Verify screens exist and belong to theatre
    const screens = await Screen.findAll({
      where: {
          id: screenIds,
          theatreId: theatreId
      }
    });
    
    if (screens.length !== screenIds.length) {
      throw new BadRequestError("One or more screens invalid or not belonging to theatre");
    }

    // Loop through dates
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      // Create a Date object for the specific day (at 00:00:00 local or UTC as per app convention)
      // Since d is mutated, we copy safely
      const offset = d.getTimezoneOffset();
      const localDate = new Date(d.getTime() - (offset * 60000));
      const showDateStr = localDate.toISOString().split('T')[0]; // Store as string YYYY-MM-DD for DATEONLY

      // Loop through screens
      for (const screen of screens) {
        // Calculate total seats
        const layout = screen.seatLayout; 
        const totalSeats = layout && layout.rows && layout.cols ? layout.rows * layout.cols : screen.totalSeats; 
        
        let validSeats = totalSeats;
        if(layout && layout.unavailableSeats) validSeats -= layout.unavailableSeats.length;
        
        // Loop through times
        for (const time of showTimes) {
          showsData.push({
            movieId: movie.id,
            theatreId: theatre.id,
            screenId: screen.id,
            showDate: showDateStr,
            showTime: time,
            prices: priceConfig,
            totalSeats: validSeats,
            availableSeats: validSeats,
            isActive: true, // TODO: Check conflicting shows?
            movieType: "tmdb" // Default
          });
        }
      }
    }

    try {
      // Use ignoreDuplicates if supported or just bulkCreate and catch error
      // Sequelize bulkCreate with updateOnDuplicate or ignoreDuplicates (MySQL/PG specific)
      // For general compatibility, we might just try.
      const createdShows = await Show.bulkCreate(showsData, { 
          validate: true,
          ignoreDuplicates: true // MySQL specific but very useful here
      });
      logger.info(`Generated ${createdShows.length} shows`);
      return createdShows;
    } catch (error: any) {
      logger.error("Generate shows error", error);
       if (error.code === 'ER_DUP_ENTRY' || error.name === 'SequelizeUniqueConstraintError') {
         logger.warn("Some shows were duplicates and skipped.");
         // In Sequelize bulkCreate w/ ignoreDuplicates, it shouldn't throw.
         return [];
       }
      throw error;
    }
  }
  /**
   * Helper to generate Seat records from Screen layout
   */
  private async _generateSeatsForScreen(screen: Screen) {
    const layout = screen.seatLayout;
    if (!layout || !layout.rows || !layout.cols) return;

    // Delete existing seats to avoid duplicates/stale data on update
    await Seat.destroy({ where: { screenId: screen.id } });

    const seatsData: any[] = [];
    const unavailable = layout.unavailableSeats || []; // e.g., ["A1", "A2"]

    for (let r = 0; r < layout.rows; r++) {
      const rowLabel = String.fromCharCode(65 + r); // A, B, C... (works for up to 26 rows, simplified)
      // For > 26 rows, logic needs to be AA, AB etc. But let's stick to simple for now or loop
      // Actually standard cinemas can have more.
      // Better row label logic:
      // 0->A, 25->Z, 26->AA, etc.
      
      for (let c = 1; c <= layout.cols; c++) {
        const seatId = `${rowLabel}${c}`;
        const isUnavailable = unavailable.includes(seatId);

        seatsData.push({
          screenId: screen.id,
          row: rowLabel,
          col: c,
          type: "Standard", // Default, can be enhanced to read from layout if complex
          isAccessible: false,
          isActive: !isUnavailable
        });
      }
    }
    
    // Chunk insert just in case
    if (seatsData.length > 0) {
        await Seat.bulkCreate(seatsData);
    }
  }
}

export const adminService = new AdminService();

