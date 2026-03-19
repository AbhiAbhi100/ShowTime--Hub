
import axios from 'axios';
import https from 'https';

const url = 'https://api.themoviedb.org/3/movie/popular?api_key=9f7beb686c7bff4bdf3394a2cabef160&page=1';

async function testV4() {
  console.log('Testing IPv4 force...');
  try {
    const start = Date.now();
    const agent = new https.Agent({ family: 4 });
    const res = await axios.get(url, { httpsAgent: agent, timeout: 5000 });
    console.log(`IPv4 force success in ${Date.now() - start}ms. Status: ${res.status}`);
  } catch (err: any) {
    console.error('IPv4 force failed:', err.message);
  }
}

(async () => {
  await testV4();
})();
