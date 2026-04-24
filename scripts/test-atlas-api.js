import 'dotenv/config';
import { getProcesses, getOpenAlerts } from '../config/atlas.js';

try {
    console.log('Fetching cluster processes...');
    const procs = await getProcesses();
    console.log('✅ Found', procs.results.length, 'processes');
    console.log('   Primary:', procs.results.find(p => p.typeName === 'REPLICA_PRIMARY')?.id);

    console.log('\nFetching open alerts...');
    const alerts = await getOpenAlerts();
    console.log('✅ Open alerts:', alerts.results.length);
} catch (err) {
    console.error('❌ Atlas API failed:', err.message);
}