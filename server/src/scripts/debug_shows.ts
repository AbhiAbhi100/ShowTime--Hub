
import dotenv from "dotenv";
import path from "path";
import sequelize from "../config/database";
import { Show, Theatre, City, Movie, Screen } from "../models";

// Load environment variables
dotenv.config({ path: path.join(__dirname, "../../.env") });

async function debugShows() {
  console.log("🛠️  Debugging Shows...");

  try {
    await sequelize.authenticate();
    console.log("✅ Database connected");

    // The movie ID from the user screenshot URL: 1339952
    const tmdbId = "1339952"; 
    let movieId = tmdbId;

    const movie = await Movie.findOne({ where: { tmdbId } });
    if (movie) {
        console.log(`✅ Resolving TMDB ID ${tmdbId} -> UUID ${movie.id}`);
        movieId = movie.id;
    } else {
        console.log(`⚠️  TMDB ID ${tmdbId} not found in DB. Using as is.`);
    }

    console.log(`\n🔍 Searching for shows for Movie ID: ${movieId}...`);

    const shows = await Show.findAll({
      where: { movieId },
      include: [
        {
          model: Theatre,
          as: "theatre",
          include: [{ model: City, as: "city" }],
        },
        {
          model: Screen,
          as: "screen"
        }
      ],
      order: [['showDate', 'ASC']],
    });

    console.log(`Found ${shows.length} shows.`);

    if (shows.length === 0) {
        console.log("⚠️  Trying wildcard search on ALL shows to see movieIds...");
        const allShows = await Show.findAll({ limit: 5 });
        allShows.forEach(s => console.log(`   Show ID: ${s.id}, Movie ID: ${s.movieId}, Date: ${s.showDate}`));
    }

    const s = shows[0];
    if (!s) {
        console.log("❌ No shows found.");
        process.exit(0);
    }

    const info = {
        id: s.id,
        movieId: s.movieId,
        screenId: s.screenId,
        screenName: s.screen?.name,
        seatLayoutSummary: s.screen?.seatLayout ? {
            rows: s.screen.seatLayout.rows,
            cols: s.screen.seatLayout.cols,
            hasTypes: !!s.screen.seatLayout.types,
            hasRowLabels: !!s.screen.seatLayout.rowLabels, // Check if this exists
            typesKeys: s.screen.seatLayout.types ? Object.keys(s.screen.seatLayout.types) : []
        } : "MISSING",
        isActive: s.isActive
    };

    console.log(JSON.stringify(info, null, 2));

    process.exit(0);
  } catch (error) {
    console.error("❌ Debug failed:", error);
    process.exit(1);
  }
}

debugShows();
