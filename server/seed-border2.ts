import { Movie, Show, Theatre, Screen } from "./src/models";
import sequelize from "./src/config/database";
import { Op } from "sequelize";

async function seedBorder2() {
  try {
    await sequelize.authenticate();
    console.log("Database connected.");

    // 1. Find Border 2
    const movieName = "Border 2";
    const movie = await Movie.findOne({
        where: sequelize.where(sequelize.fn('LOWER', sequelize.col('title')), 'LIKE', `%${movieName.toLowerCase()}%`)
    });

    if (!movie) {
        console.error("Movie 'Border 2' not found in DB!");
        return;
    }

    console.log(`Seeding shows for: ${movie.title} (ID: ${movie.id})`);

    // 2. Find Theatres
    const theatres = await Theatre.findAll({
        where: { isActive: true },
        include: [{ model: Screen, as: 'screens' }]
    });

    if (theatres.length === 0) {
        console.error("No active theatres found.");
        return;
    }

    // 3. Generate Shows
    const today = new Date();
    const showTimes = ["10:00", "13:00", "16:00", "19:00", "22:00"];
    let createdCount = 0;

    for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];

        for (const theatre of theatres) {
             // @ts-ignore
             const screens = theatre.screens || [];
             if (screens.length === 0) continue;

             // Pick first screen for simplicity
             const screen = screens[0];

             for (const time of showTimes) {
                 const existing = await Show.findOne({
                     where: {
                         theatreId: theatre.id,
                         screenId: screen.id,
                         showDate: dateStr,
                         showTime: time
                     }
                 });

                 if (!existing) {
                     await Show.create({
                         movieId: movie.id,
                         theatreId: theatre.id,
                         screenId: screen.id,
                         showDate: dateStr,
                         showTime: time,
                         totalSeats: screen.totalSeats,
                         availableSeats: screen.totalSeats,
                         prices: { "Regular": 180, "Premium": 280, "VIP": 450 },
                         isActive: true
                     });
                     createdCount++;
                 }
             }
        }
    }

    console.log(`Successfully created ${createdCount} shows for ${movie.title}.`);

  } catch (error) {
    console.error("Seeding error:", error);
  } finally {
    await sequelize.close();
  }
}

seedBorder2();
