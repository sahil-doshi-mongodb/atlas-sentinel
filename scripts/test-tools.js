import 'dotenv/config';
import { TOOLS } from '../tools/index.js';
import { closeAll } from '../config/mongo.js';

console.log('Testing all tools...\n');

const tests = [
    { name: 'get_server_status', args: {} },
    { name: 'get_current_op', args: {} },
    { name: 'get_coll_stats', args: { collection: 'orders' } },
    { name: 'get_index_stats', args: { collection: 'orders' } },
    { name: 'sample_schema', args: { collection: 'past_incidents', n: 2 } },
    { name: 'get_replication_status', args: {} },
    { name: 'get_cluster_metrics', args: { period_minutes: 5 } },
    { name: 'get_slow_queries', args: { since_minutes: 10, limit: 3 } },
    { name: 'get_open_alerts', args: {} },
    { name: 'search_similar_incidents', args: { symptoms: 'high cpu, slow queries, dropped index', k: 2 } },
    { name: 'recommend_partner_solution', args: { issue_category: 'indexing' } },
];

for (const t of tests) {
    process.stdout.write(`${t.name.padEnd(30)} ... `);
    try {
        const result = await TOOLS[t.name].fn(t.args);
        const summary = JSON.stringify(result).slice(0, 80);
        console.log('✅', summary + (JSON.stringify(result).length > 80 ? '...' : ''));
    } catch (err) {
        console.log('❌', err.message);
    }
}

console.log('\n✅ Tool testing complete');
await closeAll();