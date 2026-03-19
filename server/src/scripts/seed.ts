/**
 * Database Seed Script for ShowTime Hub
 *
 * This script populates the database with:
 * 1. Cities (Indian cities)
 * 2. Theatres (linked to cities)
 * 3. Shows (fetched from TMDB "now playing" and created dynamically)
 * 4. Default admin user
 *
 * Usage: npm run seed
 */

import mongoose from "mongoose";
import axios from "axios";
import dotenv from "dotenv";
import path from "path";

// Load environment variables
dotenv.config({ path: path.join(__dirname, "../../.env") });

import { City, Theatre, Show, Admin } from "../models/index";

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/showtime-hub";
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = "https://api.themoviedb.org/3";

// ============================================
// SEED DATA
// ============================================

const citiesData = [
  { name: "Mumbai", state: "Maharashtra", icon: "🏙️" },
  { name: "Delhi-NCR", state: "Delhi", icon: "🏛️" },
  { name: "Bengaluru", state: "Karnataka", icon: "💻" },
  { name: "Chennai", state: "Tamil Nadu", icon: "🛕" },
  { name: "Hyderabad", state: "Telangana", icon: "🌊" },
  { name: "Kolkata", state: "West Bengal", icon: "🌉" },
  { name: "Ahmedabad", state: "Gujarat", icon: "🏗️" },
  { name: "Pune", state: "Maharashtra", icon: "🎓" },
];

const theatresByCity: Record<
  string,
  Array<{
    name: string;
    address: string;
    totalSeats: number;
    amenities: string[];
  }>
> = {
  Mumbai: [
    {
      name: "PVR Cinemas - Phoenix Mall",
      address: "Lower Parel",
      totalSeats: 150,
      amenities: ["Dolby Atmos", "IMAX", "Parking", "Food Court"],
    },
    {
      name: "INOX - R-City Mall",
      address: "Ghatkopar",
      totalSeats: 120,
      amenities: ["3D", "Parking", "Recliner Seats", "Food Court"],
    },
    {
      name: "Cinepolis - Viviana Mall",
      address: "Thane",
      totalSeats: 140,
      amenities: ["Dolby Atmos", "3D", "Parking", "Wheelchair Accessible"],
    },
    {
      name: "Carnival Cinemas - Andheri",
      address: "Andheri West",
      totalSeats: 100,
      amenities: ["AC", "Parking", "Food Court"],
    },
  ],
  "Delhi-NCR": [
    {
      name: "PVR Director's Cut - Ambience",
      address: "Vasant Kunj",
      totalSeats: 100,
      amenities: ["Luxury Seating", "Butler Service", "Dolby Atmos"],
    },
    {
      name: "INOX - Select Citywalk",
      address: "Saket",
      totalSeats: 180,
      amenities: ["IMAX", "Dolby Atmos", "Parking", "Food Court"],
    },
    {
      name: "Cinepolis - DLF Mall of India",
      address: "Noida",
      totalSeats: 200,
      amenities: ["4DX", "IMAX", "Parking", "Gaming Zone"],
    },
    {
      name: "PVR Logix",
      address: "Noida",
      totalSeats: 130,
      amenities: ["3D", "Parking", "Food Court"],
    },
  ],
  Bengaluru: [
    {
      name: "PVR - Forum Mall",
      address: "Koramangala",
      totalSeats: 160,
      amenities: ["IMAX", "Dolby Atmos", "Parking"],
    },
    {
      name: "INOX - Mantri Mall",
      address: "Malleshwaram",
      totalSeats: 140,
      amenities: ["3D", "Parking", "Food Court"],
    },
    {
      name: "Cinepolis - Royal Meenakshi Mall",
      address: "Bannerghatta Road",
      totalSeats: 150,
      amenities: ["Dolby Atmos", "Recliner Seats", "Parking"],
    },
  ],
  Chennai: [
    {
      name: "SPI Palazzo - The Forum",
      address: "Vadapalani",
      totalSeats: 180,
      amenities: ["IMAX", "Dolby Atmos", "Luxury Seating"],
    },
    {
      name: "PVR - Express Avenue",
      address: "Royapettah",
      totalSeats: 150,
      amenities: ["3D", "Parking", "Food Court"],
    },
  ],
  Hyderabad: [
    {
      name: "PVR - Inorbit Mall",
      address: "Madhapur",
      totalSeats: 170,
      amenities: ["IMAX", "Dolby Atmos", "Parking"],
    },
    {
      name: "INOX - GVK One",
      address: "Banjara Hills",
      totalSeats: 130,
      amenities: ["3D", "Luxury Seating", "Parking"],
    },
    {
      name: "AMB Cinemas",
      address: "Gachibowli",
      totalSeats: 200,
      amenities: ["IMAX", "Dolby Atmos", "Premium Seating", "Valet Parking"],
    },
  ],
  Kolkata: [
    {
      name: "INOX - South City Mall",
      address: "Prince Anwar Shah Road",
      totalSeats: 160,
      amenities: ["IMAX", "Dolby Atmos", "Parking"],
    },
    {
      name: "PVR - Quest Mall",
      address: "Park Circus",
      totalSeats: 140,
      amenities: ["3D", "Recliner Seats", "Food Court"],
    },
  ],
  Ahmedabad: [
    {
      name: "PVR - Acropolis Mall",
      address: "Thaltej",
      totalSeats: 150,
      amenities: ["3D", "Dolby Atmos", "Parking"],
    },
    {
      name: "Cinepolis - Alpha One Mall",
      address: "Vastrapur",
      totalSeats: 180,
      amenities: ["IMAX", "4DX", "Parking", "Food Court"],
    },
  ],
  Pune: [
    {
      name: "PVR - Phoenix Marketcity",
      address: "Viman Nagar",
      totalSeats: 160,
      amenities: ["IMAX", "Dolby Atmos", "Parking"],
    },
    {
      name: "INOX - Amanora Mall",
      address: "Hadapsar",
      totalSeats: 140,
      amenities: ["3D", "Recliner Seats", "Parking"],
    },
  ],
};

const showTimes = ["10:00", "13:30", "17:00", "21:00"];

const pricesByTime: Record<string, { regular: number; premium: number; vip: number }> = {
  "10:00": { regular: 250, premium: 350, vip: 500 },
  "13:30": { regular: 300, premium: 400, vip: 550 },
  "17:00": { regular: 350, premium: 450, vip: 600 },
  "21:00": { regular: 400, premium: 500, vip: 650 },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

async function fetchTMDBMovies(): Promise<Array<{ id: string; title: string }>> {
  if (!TMDB_API_KEY) {
    console.warn("⚠️  TMDB_API_KEY not set. Using fallback movie IDs.");
    // Fallback to some classic movie IDs that are likely to exist
    return [
      { id: "155", title: "The Dark Knight" },
      { id: "157336", title: "Interstellar" },
      { id: "872585", title: "Oppenheimer" },
      { id: "693134", title: "Dune: Part Two" },
      { id: "786892", title: "Furiosa" },
    ];
  }

  try {
    // Fetch now playing movies
    const nowPlayingRes = await axios.get(
      `${TMDB_BASE_URL}/movie/now_playing?api_key=${TMDB_API_KEY}&region=IN`
    );
    const nowPlaying = nowPlayingRes.data.results.slice(0, 8);

    // Fetch upcoming movies
    const upcomingRes = await axios.get(
      `${TMDB_BASE_URL}/movie/upcoming?api_key=${TMDB_API_KEY}&region=IN`
    );
    const upcoming = upcomingRes.data.results.slice(0, 4);

    const movies = [...nowPlaying, ...upcoming].map((m: any) => ({
      id: String(m.id),
      title: m.title,
    }));

    console.log(`📽️  Fetched ${movies.length} movies from TMDB`);
    return movies;
  } catch (error) {
    console.error("Failed to fetch TMDB movies:", error);
    return [
      { id: "155", title: "The Dark Knight" },
      { id: "157336", title: "Interstellar" },
    ];
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

// ============================================
// MAIN SEED FUNCTION
// ============================================

async function seed() {
  console.log("🌱 Starting database seed...\n");

  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    // Clear existing data
    console.log("🗑️  Clearing existing data...");
    await Promise.all([
      City.deleteMany({}),
      Theatre.deleteMany({}),
      Show.deleteMany({}),
      // Don't delete admins or bookings
    ]);
    console.log("✅ Cleared existing cities, theatres, and shows\n");

    // 1. Create Cities
    console.log("🏙️  Creating cities...");
    const cityDocs: Record<string, any> = {};
    for (const cityData of citiesData) {
      const city = await City.create({
        name: cityData.name,
        state: cityData.state,
        icon: cityData.icon,
        isActive: true,
      });
      cityDocs[cityData.name] = city;
      console.log(`   ✓ ${cityData.name}`);
    }
    console.log(`✅ Created ${Object.keys(cityDocs).length} cities\n`);

    // 2. Create Theatres
    console.log("🎭 Creating theatres...");
    const theatreDocs: any[] = [];
    for (const [cityName, theatres] of Object.entries(theatresByCity)) {
      const city = cityDocs[cityName];
      if (!city) continue;

      for (const theatreData of theatres) {
        const theatre = await Theatre.create({
          name: theatreData.name,
          city: city._id,
          address: theatreData.address,
          totalSeats: theatreData.totalSeats,
          amenities: theatreData.amenities,
          isActive: true,
        });
        theatreDocs.push(theatre);
        console.log(`   ✓ ${theatreData.name} (${cityName})`);
      }
    }
    console.log(`✅ Created ${theatreDocs.length} theatres\n`);

    // 3. Fetch TMDB Movies
    console.log("🎬 Fetching movies from TMDB...");
    const movies = await fetchTMDBMovies();

    // 4. Create Shows
    console.log("🎟️  Creating shows...");
    const dates = getNextDays(7); // Next 7 days
    let showCount = 0;

    for (const movie of movies) {
      for (const theatre of theatreDocs) {
        for (const date of dates) {
          for (const time of showTimes) {
            const prices = pricesByTime[time];
            await Show.create({
              movieId: movie.id,
              movieType: "tmdb",
              theatre: theatre._id,
              showDate: date,
              showTime: time,
              priceRegular: prices.regular,
              pricePremium: prices.premium,
              priceVip: prices.vip,
              availableSeats: theatre.totalSeats,
              bookedSeats: [],
              isActive: true,
            });
            showCount++;
          }
        }
      }
      console.log(`   ✓ Shows for "${movie.title}" (${movie.id})`);
    }
    console.log(`✅ Created ${showCount} shows\n`);

    // 5. Create Default Admin
    console.log("👤 Creating default admin...");
    const existingAdmin = await Admin.findOne({ email: "admin@showtime.com" });
    if (!existingAdmin) {
      await Admin.create({
        email: "admin@showtime.com",
        password: "admin123", // Will be hashed by the model
        isSuperAdmin: true,
      });
      console.log("   ✓ Admin created: admin@showtime.com / admin123");
    } else {
      console.log("   ⏭️  Admin already exists");
    }
    console.log("✅ Admin setup complete\n");

    // Summary
    console.log("═".repeat(50));
    console.log("📊 SEED SUMMARY");
    console.log("═".repeat(50));
    console.log(`   Cities:   ${Object.keys(cityDocs).length}`);
    console.log(`   Theatres: ${theatreDocs.length}`);
    console.log(`   Movies:   ${movies.length}`);
    console.log(`   Shows:    ${showCount}`);
    console.log("═".repeat(50));
    console.log("\n🎉 Database seeded successfully!\n");

    // Log movie IDs for reference
    console.log("📽️  Movie IDs with shows:");
    movies.forEach((m) => console.log(`   - ${m.id}: ${m.title}`));
    console.log();

  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  }
}

// Run seed
seed();
