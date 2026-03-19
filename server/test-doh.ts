
import axios from 'axios';
import https from 'https';
import fs from 'fs';

async function testDoH() {
  console.log('Testing DNS over HTTPS (DoH)...');
  const logData: any = {};
  
  try {
    const dohUrl = 'https://dns.google/resolve?name=api.themoviedb.org';
    const dohRes = await axios.get(dohUrl);
    
    logData.status = dohRes.status;
    logData.data = dohRes.data;

    if (dohRes.data && dohRes.data.Answer) {
      // Filter for A records (type 1)
      const aRecords = dohRes.data.Answer.filter((rec: any) => rec.type === 1);
      if (aRecords.length > 0) {
        const ip = aRecords[0].data;
        logData.resolvedIp = ip;
        console.log(`Resolved IP via DoH: ${ip}`);
        
        const options = {
            method: 'GET',
            hostname: 'api.themoviedb.org', // For SNI and Host header
            port: 443,
            path: '/3/movie/popular?api_key=9f7beb686c7bff4bdf3394a2cabef160&page=1',
            lookup: (hostname: string, options: any, callback: Function) => {
                console.log(`Custom lookup called for ${hostname}, returning ${ip}`);
                callback(null, ip, 4);
            }
        };
        
        const req = https.request(options, (res) => {
            logData.tmdbStatus = res.statusCode;
            console.log(`Response Status: ${res.statusCode}`);
            res.on('data', () => {}); // Consume
            fs.writeFileSync('d:/showtime-hub/server/doh-debug.json', JSON.stringify(logData, null, 2));
        });
        
        req.on('error', (e) => {
            logData.requestError = e.message;
            console.error(`Request error: ${e.message}`);
            fs.writeFileSync('d:/showtime-hub/server/doh-debug.json', JSON.stringify(logData, null, 2));
        });
        
        req.end();
            
      } else {
        logData.error = 'No A records found';
        console.error('No A records found in DoH response');
        fs.writeFileSync('d:/showtime-hub/server/doh-debug.json', JSON.stringify(logData, null, 2));
      }
    } else {
      logData.error = 'Invalid DoH response';
      console.error('Invalid DoH response or no Answer section');
      fs.writeFileSync('d:/showtime-hub/server/doh-debug.json', JSON.stringify(logData, null, 2));
    }
  } catch (err: any) {
    logData.error = err.message;
    console.error('DoH failed:', err.message);
    fs.writeFileSync('d:/showtime-hub/server/doh-debug.json', JSON.stringify(logData, null, 2));
  }
}

(async () => {
  await testDoH();
})();
