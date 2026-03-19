
import axios from 'axios';

const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const API_KEY = "eb1a74d2b2cd33a6b57112048995383a"; // Extracted from config viewing or known context

async function testTMDBQuery() {
    const today = new Date();
    const pastDate = new Date();
    pastDate.setDate(today.getDate() - 45);
    
    const todayStr = today.toISOString().split("T")[0];
    const pastDateStr = pastDate.toISOString().split("T")[0];

    console.log(`Querying TMDB: ${pastDateStr} to ${todayStr}, Language: hi`);

    const url = `${TMDB_BASE_URL}/discover/movie?api_key=${API_KEY}&primary_release_date.gte=${pastDateStr}&primary_release_date.lte=${todayStr}&sort_by=popularity.desc&page=1&region=IN&with_original_language=hi`; // Removed vote count to see raw results

    try {
        const response = await axios.get(url);
        console.log(`Total Results: ${response.data.total_results}`);
        if (response.data.results.length > 0) {
            console.log("First 3 movies:");
            response.data.results.slice(0, 3).forEach((m: any) => {
                console.log(`- ${m.title} (${m.release_date}) [Lang: ${m.original_language}] Votes: ${m.vote_count}`);
            });
        } else {
            console.log("No movies found.");
        }

    } catch (error: any) {
        console.error("Error:", error.message);
    }
}

testTMDBQuery();
