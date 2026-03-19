
import dotenv from "dotenv";
import path from "path";
import sequelize from "../config/database";
import { Movie } from "../models";

// Load environment variables
dotenv.config({ path: path.join(__dirname, "../../.env") });

async function listMovies() {
  console.log("Listing Movies...");
  try {
    await sequelize.authenticate();
    const movies = await Movie.findAll();
    console.log(JSON.stringify(movies.map(m => ({ id: m.id, title: m.title, tmdbId: (m as any).tmdbId })), null, 2));
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

listMovies();
