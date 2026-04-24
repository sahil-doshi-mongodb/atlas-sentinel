import 'dotenv/config';
import { closeAll } from '../config/mongo.js';

const SCENARIOS = {
    'collscan_avalanche': () => import('../chaos/scenarios/collscan-avalanche.js'),
    'working_set_breach': () => import('../chaos/scenarios/working-set-breach.js'),
    'connection_storm': () => import('../chaos/scenarios/connection-storm.js'),
    'schema_rot': () => import('../chaos/scenarios/schema-rot.js'),
    'replication_lag': () => import('../chaos/scenarios/replication-lag.js'),
};

const [, , scenario, action] = process.argv;

if (!scenario || !action) {
    console.log('Usage: node scripts/chaos.js <scenario> <trigger|reset>');
    console.log('Available scenarios:', Object.keys(SCENARIOS).join(', '));
    process.exit(1);
}

const loader = SCENARIOS[scenario];
if (!loader) { console.error(`❌ Unknown scenario: ${scenario}`); process.exit(1); }

const mod = await loader();
const fn = mod[action];
if (!fn) { console.error(`❌ Unknown action: ${action}`); process.exit(1); }

const result = await fn();
console.log(result);
await closeAll();
process.exit(0);   // safety: force exit even if any connection lingers