import { Movie, Show, Theatre, City } from "./src/models";
import sequelize from "./src/config/database";

async function verifySeed() {
  try {
    await sequelize.authenticate();
    console.log("Database connected.");

    // 1. Check for "Border 2" movie
    const movieName = "Border 2";
    const movies = await Movie.findAll({
        where: sequelize.where(sequelize.fn('LOWER', sequelize.col('title')), 'LIKE', `%${movieName.toLowerCase()}%`)
    });

    console.log(`Found ${movies.length} movies matching '${movieName}'`);
    movies.forEach(m => console.log(`- ID: ${m.id}, TMDB: ${m.tmdbId}, Title: ${m.title}, Active: ${m.isActive}`));

    if (movies.length === 0) {
        console.log("Movie not found in DB. Seed script only uses EXISTING movies in DB.");
        return;
    }

    const movie = movies[0];

    // 2. Check shows for this movie
    const shows = await Show.findAll({
        where: { movieId: movie.id },
        include: [
            { model: Theatre, as: 'theatre', include: [{ model: City, as: 'city' }] }
        ]
    });

    console.log(`Found ${shows.length} shows for '${movie.title}'`);
    
    // Group by Date and City
    const summary: any = {};
    shows.forEach(s => {
        const date = s.showDate;
        const city = s.theatre?.city?.name || "Unknown City";
        const key = `${date} - ${city}`;
        if (!summary[key]) summary[key] = 0;
        summary[key]++;
    });

    console.table(summary);

  } catch (error) {
    console.error("Verification error:", error);
  } finally {
    await sequelize.close();
  }
}

verifySeed();
