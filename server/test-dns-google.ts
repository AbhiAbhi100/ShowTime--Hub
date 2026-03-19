
import dns from 'dns';
import util from 'util';

const resolve4 = util.promisify(dns.resolve4);

async function checkDNS_Google() {
  console.log('Setting DNS to 8.8.8.8...');
  dns.setServers(['8.8.8.8']);
  
  try {
    console.log('Resolving api.themoviedb.org...');
    const addresses = await resolve4('api.themoviedb.org');
    console.log('IPv4 Addresses (Google DNS):', addresses);
  } catch (err: any) {
    console.error('Lookup failed:', err.message);
  }
}

(async () => {
    await checkDNS_Google();
})();
