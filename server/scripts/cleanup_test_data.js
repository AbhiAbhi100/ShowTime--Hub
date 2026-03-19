
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/showtime-hub';

async function cleanup() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log("Connected to DB");

        const City = mongoose.connection.db.collection('cities');
        const Theatre = mongoose.connection.db.collection('theatres');
        const User = mongoose.connection.db.collection('users');
        const Movie = mongoose.connection.db.collection('movies');
        const Booking = mongoose.connection.db.collection('bookings');
        const Show = mongoose.connection.db.collection('shows');
        const Screen = mongoose.connection.db.collection('screens');

        // 1. Delete Cities
        const cityRes = await City.deleteMany({ name: { $regex: /^VerifyCity_/ } });
        console.log(`Deleted ${cityRes.deletedCount} test cities.`);

        // 2. Delete Theatres
        const theatreRes = await Theatre.deleteMany({ name: "Verify Cinema" });
        console.log(`Deleted ${theatreRes.deletedCount} test theatres.`);
        
        // 3. Delete Users
        const userRes = await User.deleteMany({ email: /.*_verify@example.com/ });
        console.log(`Deleted ${userRes.deletedCount} test users.`);

        // 4. Delete Test Movie
        const movieRes = await Movie.deleteMany({ title: "Test Movie" });
        console.log(`Deleted ${movieRes.deletedCount} test movies.`);

        // 5. Delete specific shows/bookings if needed?
        // It's harder to track them without IDs, but they are linked to the deleted theatres/movies.
        // We can leave them as orphans or try to find them. 
        // For now, removing the Cities/Theatres hides them from UI.
        
        console.log("Cleanup Complete.");

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

cleanup();
