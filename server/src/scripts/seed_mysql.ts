import dotenv from "dotenv";
import path from "path";
import axios from "axios";
import sequelize from "../config/database"; // Correct import
import { User } from "../models/User";
import { City } from "../models/City";
import { Theatre } from "../models/Theatre";
import { Screen } from "../models/Screen"; // Import Screen
import { Show } from "../models/Show";
import { Movie } from "../models/Movie";

// Load environment variables
dotenv.config({ path: path.join(__dirname, "../../.env") });

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = "https://api.themoviedb.org/3";

// Seed Data
const citiesData = [
  { name: "Mumbai", code: "MUM", state: "Maharashtra", icon: "🏙️" },
  { name: "Delhi-NCR", code: "DEL", state: "Delhi", icon: "🏛️" },
  { name: "Bengaluru", code: "BLR", state: "Karnataka", icon: "💻" },
  { name: "Chennai", code: "MAA", state: "Tamil Nadu", icon: "🛕" },
  { name: "Hyderabad", code: "HYD", state: "Telangana", icon: "🌊" },
  { name: "Kolkata", code: "CCU", state: "West Bengal", icon: "🌉" },
  { name: "Ahmedabad", code: "AMD", state: "Gujarat", icon: "🏗️" },
  { name: "Pune", code: "PNQ", state: "Maharashtra", icon: "🎓" },
];

const theatresByCity: Record<
  string,
  Array<{
    name: string;
    address: string;
    totalSeats: number; // Used for Screen creation
    amenities: string[];
  }>
> = {
  Mumbai: [
    { name: "PVR Cinemas - Phoenix Mall", address: "Lower Parel", totalSeats: 150, amenities: ["Dolby Atmos", "IMAX"] },
    { name: "INOX - R-City Mall", address: "Ghatkopar", totalSeats: 120, amenities: ["3D", "Recliner Seats"] },
  ],
  "Delhi-NCR": [
    { name: "PVR Director's Cut", address: "Vasant Kunj", totalSeats: 100, amenities: ["Luxury Seating", "Butler Service"] },
    { name: "INOX - Select Citywalk", address: "Saket", totalSeats: 180, amenities: ["IMAX", "Dolby Atmos"] },
  ],
  Bengaluru: [
    { name: "PVR - Forum Mall", address: "Koramangala", totalSeats: 160, amenities: ["IMAX", "Dolby Atmos"] },
    { name: "INOX - Mantri Mall", address: "Malleshwaram", totalSeats: 140, amenities: ["3D", "Food Court"] },
  ],
};

const showTimes = ["10:00", "13:30", "17:00", "21:00"];

const pricesByTime: Record<string, { regular: number; premium: number; vip: number }> = {
  "10:00": { regular: 250, premium: 350, vip: 500 },
  "13:30": { regular: 300, premium: 400, vip: 550 },
  "17:00": { regular: 350, premium: 450, vip: 600 },
  "21:00": { regular: 400, premium: 500, vip: 650 },
};

// Helper Functions
async function fetchTMDBMovies() {
  if (!TMDB_API_KEY) {
    console.warn("⚠️ TMDB_API_KEY not set. Using fallback movies.");
    return [
      { tmdbId: "155", title: "The Dark Knight", poster_path: "/qJ2tW6WMUDux911r6m7haRef0WH.jpg", backdrop_path: "/1nU2JBaI119hQ9F7cWD9M879k2y.jpg", overview: "Batman raises the stakes in his war on crime.", release_date: "2008-07-16", vote_average: 8.5 },
      { tmdbId: "157336", title: "Interstellar", poster_path: "/gEU2QniL6E8ahDaNBAXcots80Ms.jpg", backdrop_path: "/rAiYTfKGqDCRIIqo664sY9XZIvQ.jpg", overview: "The adventures of a group of explorers...", release_date: "2014-11-05", vote_average: 8.4 },
    ];
  }

  try {
    const res = await axios.get(`${TMDB_BASE_URL}/movie/now_playing?api_key=${TMDB_API_KEY}&region=IN`);
    return res.data.results.map((m: any) => ({
      ...m,
      tmdbId: String(m.id)
    }));
  } catch (error) {
    console.error("❌ Failed to fetch TMDB movies:", error);
    return [];
  }
}

function getNextDays(count: number): string[] {
  const dates: string[] = [];
  const today = new Date();
  for (let i = 0; i < count; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    dates.push(date.toISOString().split("T")[0]);
  }
  return dates;
}

// Main Seed Function
async function seed() {
  console.log("🌱 Starting MySQL Database Seed...");

  try {
    // 1. Sync Database
    await sequelize.authenticate();
    await sequelize.sync({ alter: true }); // Ensure tables exist
    console.log("✅ Database synced");

    // 2. Create Admin User
    const adminEmail = "admin@showtime.com";
    const existingAdmin = await User.findOne({ where: { email: adminEmail } });
    if (!existingAdmin) {
      await User.create({
        email: adminEmail,
        password: "admin123", // Will be hashed by BeforeSave hook
        fullName: "Super Admin",
        role: "admin",
      });
      console.log("✅ Admin user created: admin@showtime.com / admin123");
    } else {
      console.log("⏭️  Admin user already exists");
    }

    // 3. Create Cities
    for (const cityData of citiesData) {
      const [city, created] = await City.findOrCreate({
        where: { name: cityData.name },
        defaults: { ...cityData, isActive: true },
      });
      if (created) console.log(`   ✓ City created: ${city.name}`);
    }
    const allCities = await City.findAll();

    // 4. Create Theatres & Screens
    const screenDocs: Screen[] = [];
    
    for (const city of allCities) {
      const theatres = theatresByCity[city.name] || [];
      for (const tData of theatres) {
        // Create Theatre
        const [theatre, created] = await Theatre.findOrCreate({
          where: { name: tData.name, cityId: city.id },
          defaults: {
            ...tData, // cityId, amenities
            cityId: city.id,
            isActive: true,
            // totalSeats removed as it's not in Theatre model
          },
        });
        
        if (created) console.log(`   ✓ Theatre created: ${theatre.name} (${city.name})`);

        // Create Screens for this Theatre
        // For simplicity, create 2 screens per theatre
        const screenNames = ["Screen 1", "Screen 2"];
        for (const sName of screenNames) {
           const [screen, sCreated] = await Screen.findOrCreate({
             where: { name: sName, theatreId: theatre.id },
             defaults: {
               name: sName,
               theatreId: theatre.id,
               totalSeats: tData.totalSeats, // Use capacity from theatre data
               seatLayout: { rows: 10, cols: 15 }, // Dummy layout
               type: "Standard"
             }
           });
           screenDocs.push(screen);
           if (sCreated) console.log(`     - Screen created: ${screen.name}`);
        }
      }
    }

    // 5. Fetch Movies and Create Shows
    console.log("🎬 Fetching movies...");
    const tmdbResults = await fetchTMDBMovies();
    const movieDocs: Movie[] = [];

    // Create Movies in DB
    for (const m of tmdbResults) {
      const [movie, created] = await Movie.findOrCreate({
        where: { title: m.title }, // Simple check by title, or better by tmdbId
        defaults: {
          title: m.title,
          tmdbId: m.tmdbId,
          posterUrl: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : null,
          bannerUrl: m.backdrop_path ? `https://image.tmdb.org/t/p/original${m.backdrop_path}` : null,
          description: m.overview,
          releaseDate: m.release_date ? new Date(m.release_date) : new Date(),
          rating: m.vote_average,
          isActive: true,
          status: "active",
          isAutoFetched: true
        }
      });
      movieDocs.push(movie);
      if (created) console.log(`   ✓ Movie created: ${movie.title}`);
    }
    
    console.log("🎟️  Creating shows...");
    const dates = getNextDays(7);
    let showCount = 0;

    for (const movie of movieDocs) {
      if (screenDocs.length === 0) break;

      // Pick random screens for each movie
      const randomScreens = screenDocs.sort(() => 0.5 - Math.random()).slice(0, 5);

      for (const screen of randomScreens) {
        for (const date of dates) {
          for (const time of showTimes) {
             // Check for existing show on this screen/time
            const existingShow = await Show.findOne({
              where: {
                screenId: screen.id,
                showDate: date,
                showTime: time,
              },
            });

            if (!existingShow) {
              const pricesTime = pricesByTime[time];
              await Show.create({
                movieId: movie.id, // Use the DB UUID
                theatreId: screen.theatreId,
                screenId: screen.id,
                showDate: date,
                showTime: time,
                prices: pricesTime, // Store prices object
                totalSeats: screen.totalSeats,
                availableSeats: screen.totalSeats,
                bookedSeatIds: [], // Empty array
                isActive: true,
              });
              showCount++;
            }
          }
        }
      }
      console.log(`   ✓ Shows for "${movie.title}"`);
    }
    console.log(`✅ Created ${showCount} new shows`);

    console.log("\n🎉 Database seeded successfully!\n");
    process.exit(0);
  } catch (error: any) {
    console.error("❌ Seed failed:", error);
    if (error.errors) {
      error.errors.forEach((e: any) => {
        console.error(`Status: ${e.message}, Field: ${e.path}, Value: ${e.value}`);
      });
    }
    process.exit(1);
  }
}

seed();
