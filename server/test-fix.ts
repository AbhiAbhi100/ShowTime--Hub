
import axios from 'axios';
import https from 'https';
import dns from 'dns';

// Cache for TMDB IP
let cachedTMDBIp: string | null = null;
let lastLookupTime = 0;
const CACHE_TTL = 3600000; // 1 hour

// Helper to resolve TMDB IP via Google (DoH) to bypass ISP DNS issues
const getTMDBIp = async (): Promise<string> => {
  if (cachedTMDBIp && (Date.now() - lastLookupTime < CACHE_TTL)) {
    return cachedTMDBIp;
  }

  try {
    console.log("Resolving TMDB IP via Google DoH...");
    const response = await axios.get("https://dns.google/resolve?name=api.themoviedb.org", {
      timeout: 5000
    });
    
    if (response.data?.Answer) {
      const aRecord = response.data.Answer.find((rec: any) => rec.type === 1);
      if (aRecord?.data) {
        cachedTMDBIp = aRecord.data;
        lastLookupTime = Date.now();
        console.log(`Resolved TMDB IP to: ${cachedTMDBIp}`);
        return cachedTMDBIp!;
      }
    }
    throw new Error("No A record found for TMDB");
  } catch (error: any) {
    console.warn("DoH lookup failed, falling back to system DNS:", error.message);
    return ""; // Empty string signals to use system lookup
  }
};

// Custom agent to use the resolved IP
const tmdbAgent = new https.Agent({
  lookup: (hostname, _options, callback) => {
    if (hostname === "api.themoviedb.org") {
        getTMDBIp().then((ip) => {
            if (ip) {
                callback(null, ip, 4);
            } else {
                // Fallback to system lookup
                 dns.lookup(hostname, { family: 4 }, (err, address, family) => {
                    callback(err, address as string, family);
                });
            }
        }).catch((err) => {
            callback(err, "", 4);
        });
    } else {
        // Fallback for other domains
         dns.lookup(hostname, { family: 4 }, (err, address, family) => {
             callback(err, address as string, family);
        });
    }
  },
  family: 4 // Force IPv4
});

const url = 'https://api.themoviedb.org/3/movie/popular?api_key=9f7beb686c7bff4bdf3394a2cabef160&page=1';

async function verifyFix() {
  console.log('Verifying fix...');
  try {
    const start = Date.now();
    const res = await axios.get(url, { httpsAgent: tmdbAgent, timeout: 10000 });
    console.log(`Fix Verification Success! Status: ${res.status} in ${Date.now() - start}ms`);
    console.log('Sample movie:', res.data.results[0].title);
  } catch (err: any) {
    console.error('Fix Verification Failed:', err.message);
  }
}

(async () => {
  await verifyFix();
})();
