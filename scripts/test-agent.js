import 'dotenv/config';
import { diagnose } from '../agent/orchestrator.js';
import { closeAll } from '../config/mongo.js';

const emit = (event) => {
    if (event.type === 'reasoning') {
        console.log(`💭 [${event.step}] ${event.text.slice(0, 250)}`);
    } else if (event.type === 'tool_call') {
        console.log(`→  [${event.step}] ${event.tool}(${JSON.stringify(event.input).slice(0, 100)})`);
    } else if (event.type === 'tool_result') {
        console.log(`✓  [${event.step}] ${event.tool}: ${event.result_summary.slice(0, 120)}`);
    } else if (event.type === 'tool_error') {
        console.log(`✗  [${event.step}] ${event.tool}: ${event.error}`);
    } else if (event.type === 'thinking' || event.type === 'synthesizing') {
        console.log(`🧠 ${event.text}`);
    } else if (event.type === 'final') {
        console.log('\n' + '='.repeat(70));
        console.log('📋 FINAL DIAGNOSTIC REPORT:');
        console.log('='.repeat(70));
        console.log(JSON.stringify(event.report, null, 2));
    } else if (event.type === 'max_steps_reached') {
        console.log('⚠️  Max steps reached');
    }
};

console.log('🛡️  Atlas Health Sentinel — Diagnostic Agent\n');

const start = Date.now();
await diagnose({
    userQuery: 'Run a general health check on the cluster. Look for any anomalies in metrics, indexes, or schema.',
    emit,
});
const elapsed = Math.round((Date.now() - start) / 1000);

console.log(`\n⏱️  Total time: ${elapsed}s`);
await closeAll();