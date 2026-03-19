
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env
dotenv.config({ path: path.join(__dirname, '../.env') });

async function checkDB() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to DB");

        const theatres = await mongoose.connection.db.collection('theatres').find({}).toArray();
        const screens = await mongoose.connection.db.collection('screens').find({}).toArray();
        const cities = await mongoose.connection.db.collection('cities').find({}).toArray();
        const shows = await mongoose.connection.db.collection('shows').find({}).toArray();

        console.log(`Total Cities: ${cities.length}`);
        cities.forEach(c => console.log(`CITY: ${c.name} ID: ${c._id}`));

        console.log(`Total Theatres: ${theatres.length}`);
        theatres.forEach(t => console.log(`THEATRE: ${t.name} (CityID: ${t.city})`));

        console.log(`Total Screens: ${screens.length}`);
        
        console.log(`Total Shows: ${shows.length}`);
        shows.slice(0,5).forEach(s => console.log(` - Show (${s._id}) for movie ${s.movieId} at ${s.showTime}`));

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

checkDB();
