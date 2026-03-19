
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { Booking, User, Theatre, Show, Movie, City } from "../models/index";

dotenv.config({ path: path.join(__dirname, "../../.env") });

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/showtime-hub";

async function debugStats() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log("Connected to DB");

        const bookingsCount = await Booking.countDocuments();
        const usersCount = await User.countDocuments();
        const theatresCount = await Theatre.countDocuments();
        const showsCount = await Show.countDocuments();
        const moviesCount = await Movie.countDocuments();
        const citiesCount = await City.countDocuments();
        
        const bookings = await Booking.find({});
        console.log(`Bookings Sample (first 2):`, JSON.stringify(bookings.slice(0, 2), null, 2));

        console.log({
            bookingsCount,
            usersCount,
            theatresCount,
            showsCount,
            moviesCount,
            citiesCount
        });

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await mongoose.disconnect();
    }
}

debugStats();
