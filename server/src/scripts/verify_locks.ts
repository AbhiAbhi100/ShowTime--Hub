import axios from "axios";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(__dirname, "../../.env") });

const API_URL = "http://localhost:5000/api/v1";

async function verifyLocks() {
  try {
    console.log("🚀 Starting Verification...");

    // 1. Register a new user
    console.log("🔑 Registering test user...");
    const email = `test.lock.${Date.now()}@example.com`;
    const password = "password123";
    
    try {
        await axios.post(`${API_URL}/auth/register`, {
            email,
            password,
            fullName: "Test Lock User"
        });
        console.log("✅ Registered");
    } catch (e) {
        // Ignore if exists, try login
    }

    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      email,
      password
    });
    const token = loginRes.data.token;
    console.log("✅ Logged in");

    // 2. Get a Show
    console.log("🎬 Fetching shows...");
    // Just pick a random show or one we know exists. 
    // We can fetch from debug/all if needed, asking shows/debug/all
    const allShowsRes = await axios.get("http://localhost:5000/api/shows/debug/all"); // Use raw port if needed
    const show = allShowsRes.data.shows[0];
    if (!show) throw new Error("No shows found");
    console.log(`✅ Using Show ID: ${show.id}`);

    // 3. Lock a Seat
    const seatId = "A1";
    console.log(`🔒 Locking seat ${seatId}...`);
    try {
        await axios.post(`${API_URL}/shows/${show.id}/lock`, {
            seats: [seatId]
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log("✅ Seat Details Locked");
    } catch (e: any) {
        console.error("❌ Failed to lock:", e.response?.data || e.message);
        // If already booked/locked, try A2
    }

    // 4. Verify Lock status
    console.log("🔍 Checking lock status...");
    const showDetails = await axios.get(`${API_URL}/shows/${show.id}`);
    const lockedSeats = showDetails.data.lockedSeatIds || [];
    console.log("Locked Seats:", lockedSeats);
    
    if (lockedSeats.includes(seatId)) {
        console.log("✅ Seat is correctly reported as locked");
    } else {
        console.error("❌ Seat is NOT reported as locked");
    }

    // 5. Unlock Seat
    console.log("🔓 Unlocking seat...");
    await axios.post(`${API_URL}/shows/${show.id}/unlock`, {
        seats: [seatId]
    }, {
        headers: { Authorization: `Bearer ${token}` }
    });
    console.log("✅ Seat Unlocked");

    // 6. Verify Unlock
    const showDetailsAfter = await axios.get(`${API_URL}/shows/${show.id}`);
    if (!showDetailsAfter.data.lockedSeatIds?.includes(seatId)) {
        console.log("✅ Seat is correctly reported as free");
    } else {
        console.error("❌ Seat is still locked");
    }

  } catch (error: any) {
    console.error("❌ Verification Failed:", error.response?.data || error.message);
  }
}

verifyLocks();
