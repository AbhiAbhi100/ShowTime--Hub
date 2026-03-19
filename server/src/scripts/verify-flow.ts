import { User } from "../models/User";
import { City } from "../models/City";
import { Theatre } from "../models/Theatre";
import { Screen } from "../models/Screen";
import { Movie } from "../models/Movie";
import { Show } from "../models/Show";
import { Booking } from "../models/Booking";
import sequelize, { connectDatabase } from "../config/database";
import jwt from "jsonwebtoken";
import config from "../config";

const API_URL = "http://localhost:5000/api";
const ADMIN_EMAIL = "admin_verify@example.com";
const USER_EMAIL = "user_verify@example.com";
const PASSWORD = "password123";

async function run() {
  console.log("Starting Verification (MySQL)...");

  try {
    // 0. Health Check
    try {
      const health = await fetch(`${API_URL}/health`);
      console.log("Health Check:", health.status, await health.json());
    } catch (e) {
      console.error("SERVER NOT REACHABLE. Please start the server first.");
      console.error(e);
      process.exit(1);
    }

    // 1. Connect to DB for cleanup
    console.log("Connecting to Database for setup/cleanup...");
    await connectDatabase();

    // 2. Cleanup & Create Admin
    console.log("Cleaning up test data...");
    await Booking.destroy({ where: {} }); 
    
    const adminExists = await User.findOne({ where: { email: ADMIN_EMAIL } });
    if (adminExists) await adminExists.destroy();
    
    const userExists = await User.findOne({ where: { email: USER_EMAIL } });
    if (userExists) await userExists.destroy();

    console.log("Creating Admin User...");
    const admin = await User.create({
      email: ADMIN_EMAIL,
      password: PASSWORD,
      fullName: "Admin Verify",
      role: "admin",
    });
    console.log(`Admin User Created: ${admin.id}`);

    // 3. Test Login
    console.log("Testing Admin Login...");
    const loginRes = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: PASSWORD }),
    });
    
    if (!loginRes.ok) throw new Error(`Login Failed: ${await loginRes.text()}`);
    const loginData = await loginRes.json();
    const token = loginData.token;
    console.log("Admin Logged In");

    const authHeaders = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    };

    // 4. Create City
    console.log("Creating City...");
    const randomSuffix = Date.now().toString().slice(-4);
    const cityRes = await fetch(`${API_URL}/admin/cities`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ 
        name: `VerifyCity_${randomSuffix}`, 
        code: `VER_${randomSuffix}`,
        state: "VerifyState",
        image: "https://example.com/city.jpg" 
      }),
    });
    
    if (!cityRes.ok) throw new Error(`City Create Failed: ${await cityRes.text()}`);
    const city = await cityRes.json();
    console.log(`City Created: ${city.id} (${city.name})`);

    // 5. Create Theatre
    console.log("Creating Theatre...");
    const theatreRes = await fetch(`${API_URL}/admin/theatres`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        name: "Verify Cinema",
        city: city.id,
        address: "123 Verify St",
        amenities: ["AC", "Parking"],
        image: "http://example.com/theatre.jpg",
      }),
    });
    
    if (!theatreRes.ok) throw new Error(`Theatre Create Failed: ${await theatreRes.text()}`);
    const theatre = await theatreRes.json();
    console.log(`Theatre Created: ${theatre.id}`);

    // 6. Add Screen
    console.log("Adding Screen...");
    const screenRes = await fetch(`${API_URL}/admin/theatres/${theatre.id}/screens`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        name: "Screen 1",
        totalSeats: 50,
        seatLayout: {
          rows: 5,
          cols: 10,
          rowLabels: ["A","B","C","D","E"],
          types: { "Standard": { label: "Standard", price: 150, rows: [1,2,3,4,5] } },
          gapRows: [],
          gapCols: [],
          unavailableSeats: []
        },
      }),
    });
    
    if (!screenRes.ok) throw new Error(`Screen Create Failed: ${await screenRes.text()}`);
    const screen = await screenRes.json();
    console.log(`Screen Created: ${screen.id}`);

    // 7. Get/Create Movie
    console.log("Checking/Creating Movie...");
    const movie = await Movie.create({
      title: `Test Movie ${randomSuffix}`,
      tmdbId: parseInt(randomSuffix),
      description: "Test Description",
      posterPath: "/test.jpg",
      backdropPath: "/test_bg.jpg",
      releaseDate: new Date(),
      language: "Hindi",
      status: "active",
      rating: 4.5,
      genres: ["Action"],
      duration: 120,
    });
    console.log(`Movie Created/Found: ${movie.id} (${movie.title})`);

    // 8. Generate Shows
    console.log("Generating Shows...");
    const today = new Date().toISOString().split("T")[0];
    const showRes = await fetch(`${API_URL}/admin/shows/generate`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        movieId: movie.id,
        theatreId: theatre.id,
        screenIds: [screen.id],
        fromDate: today,
        toDate: today,
        showTimes: ["10:00", "14:00", "18:00"],
        priceConfig: { "Standard": 200 },
      }),
    });

    if (!showRes.ok) throw new Error(`Show Generation Failed: ${await showRes.text()}`);
    const showsData = await showRes.json();
    console.log(`Shows Generated: ${showsData.count}`);

    // Find a show ID
    const show = await Show.findOne({ 
      where: { movieId: movie.id, theatreId: theatre.id } 
    });
    if (!show) throw new Error("Shown not found in DB after generation");
    console.log(`Using Show ID: ${show.id}`);

    // 9. Book Ticket (User Flow)
    console.log("Testing User Booking...");
    
    // Signup User
    const signupRes = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: USER_EMAIL, password: PASSWORD, fullName: "User Verify" }),
    });
    if (!signupRes.ok) throw new Error(`User Signup Failed: ${await signupRes.text()}`);
    const signupData = await signupRes.json();
    const userToken = signupData.token;
    console.log("User Registered & Logged In");
    
    // Book
    const userHeaders = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${userToken}`,
    };

    const bookRes = await fetch(`${API_URL}/bookings`, {
      method: "POST",
      headers: userHeaders,
      body: JSON.stringify({
        showId: show.id,
        selectedSeats: ["A1", "A2"],
        totalAmount: 400,
        movieId: movie.id,
        movieTitle: movie.title,
        theatreId: theatre.id,
        theatreName: theatre.name,
        screenId: screen.id,
        screenName: screen.name,
        showTime: "10:00", // Hardcoded to match generated
        showDate: today,
        seats: ["A1", "A2"], // redundant? validation asked for 'seats'
        bookingDate: new Date().toISOString()
      }),
    });

    if (!bookRes.ok) throw new Error(`Booking Failed: ${await bookRes.text()}`);
    const booking = await bookRes.json();
    console.log(`Booking Confirmed: ${booking.id || booking.bookingId || "Success"}`);

    console.log("VERIFICATION SUCCESSFUL!");

  } catch (err) {
    console.error("Verification Failed:", err);
    if (err instanceof Error) {
        console.error("Stack:", err.stack);
    }
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

run();
