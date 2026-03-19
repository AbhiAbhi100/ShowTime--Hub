
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

async function runDiagnostic() {
    try {
        console.log("Connecting to DB...");
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected.");
        
        // Mock the critical parts of the application
        // We can't easily import the typescript service without compilation, 
        // so we will inspect the DB state DIRECTLY for the target failure case.
        
        const movieId = "1234731"; // From screenshot URL
        const dateStr = "2025-12-28";
        
        // 1. Check if Movie exists locally
        const Movie = mongoose.connection.db.collection('movies');
        const movie = await Movie.findOne({ tmdbId: movieId });
        console.log(`[Diagnostic] Movie (tmdbId=${movieId}): ${movie ? 'FOUND (_id=' + movie._id + ')' : 'NOT FOUND'}`);
        
        if (!movie) {
            console.log(" -> This is likely the cause. The movie sync failed or wasn't triggered.");
        }

        // 2. Check Theatre (Mumbai)
        // We look for any theatre in Mumbai
        const City = mongoose.connection.db.collection('cities');
        const mumbai = await City.findOne({ name: "Mumbai" });
        if (!mumbai) {
             console.log("[Diagnostic] FATAL: Mumbai city not found in DB.");
             return;
        }
        console.log(`[Diagnostic] City Mumbai found: ${mumbai._id}`);
        
        const Theatre = mongoose.connection.db.collection('theatres');
        const theatres = await Theatre.find({ city: mumbai._id.toString() }).toArray();
        console.log(`[Diagnostic] Theatres in Mumbai: ${theatres.length}`);
        theatres.forEach(t => console.log(`   - ${t.name} (${t._id})`));

        // 3. Check Shows
        const Show = mongoose.connection.db.collection('shows');
        // Check for ANY show for this movie
        const allShows = await Show.find({ movieId: movieId }).toArray();
        console.log(`[Diagnostic] Total shows for movie ${movieId}: ${allShows.length}`);
        
        // Check for Specific Date
        // Note: Dates in Mongo are ISODate. 
        // Our query was { showDate: { $gte: ... } }
        // Let's dump all show dates to see what's stored
        allShows.forEach(s => console.log(`   - Show Date: ${s.showDate} (Type: ${typeof s.showDate})`));

        // 4. Test logic hypothesis
        if (theatres.length === 0) {
            console.log("[Diagnostic] Cause: No theatres in Mumbai.");
        } else if (!movie) {
             console.log("[Diagnostic] Cause: Movie missing locally.");
        } else if (allShows.length === 0) {
             console.log("[Diagnostic] Cause: Generator ran but failed to save shows? Or generator didn't run?");
        }
        
    } catch (err) {
        console.error("Diagnostic Error:", err);
    } finally {
        await mongoose.disconnect();
    }
}

runDiagnostic();
