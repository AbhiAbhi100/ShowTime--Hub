
import dns from 'dns';
import util from 'util';

const resolve4 = util.promisify(dns.resolve4);
const resolve6 = util.promisify(dns.resolve6);

async function checkDNS() {
  console.log('Checking DNS for api.themoviedb.org...');
  try {
    const addresses4 = await resolve4('api.themoviedb.org');
    console.log('IPv4 Addresses:', addresses4);
  } catch (err: any) {
    console.error('IPv4 Lookup failed:', err.message);
  }

  try {
    const addresses6 = await resolve6('api.themoviedb.org');
    console.log('IPv6 Addresses:', addresses6);
  } catch (err: any) {
    console.error('IPv6 Lookup failed:', err.message);
  }
}

(async () => {
    await checkDNS();
})();
