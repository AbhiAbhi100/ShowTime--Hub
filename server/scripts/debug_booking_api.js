
// Native fetch used
// If node 18+, fetch is global.

const API_URL = "http://localhost:5000/api";

async function run() {
    try {
        console.log("1. Registering Temp User...");
        const email = `testbuy${Date.now()}@example.com`;
        const pw = "password123";
        
        let res = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password: pw, fullName: "Test Buyer" })
        });
        
        let data = await res.json();
        if (!res.ok) {
            console.log("Register failed, trying login...");
            res = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password: pw })
            });
            data = await res.json();
        }
        
        if (!data.token) {
            throw new Error("Failed to get token: " + JSON.stringify(data));
        }
        
        const token = data.token;
        console.log("Got Token.");

        // 2. Book Ticket
        // We use the Show ID we found: 694f6e6179a2c92dd643ba4f
        // And we need movieId, etc.
        const payload = {
            movieId: "1234731", // The one mentioned in previous steps
            movieTitle: "Test Movie Title",
            theatreName: "Cinemax - Mumbai", 
            showTime: "10:00 AM",
            showDate: "2025-12-28",
            seats: ["H7"],
            totalAmount: 440,
            showId: "694f6e6179a2c92dd643ba4f"
        };
        
        console.log("2. Sending Booking Request...", payload);
        res = await fetch(`${API_URL}/bookings`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });
        
        const text = await res.text();
        console.log("Status:", res.status);
        console.log("Body:", text);
        
    } catch (e) {
        console.error(e);
    }
}

run();
