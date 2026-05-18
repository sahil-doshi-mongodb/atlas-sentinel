import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PID_FILE = path.join(__dirname, '../.replication-lag.pid');

export async function trigger() {
    const workerPath = path.join(__dirname, 'replication-lag-worker.js');
    const logPath = path.join(__dirname, '../.replication-lag.log');
    const out = fs.openSync(logPath, 'a');

    const child = spawn('node', [workerPath], {
        detached: true,
        stdio: ['ignore', out, out],
        env: process.env,
    });
    child.unref();

    fs.writeFileSync(PID_FILE, String(child.pid));
    console.log(`💥 CHAOS: Replication lag worker spawned (PID ${child.pid})`);
    console.log(`   Logs: ${logPath}`);
    return {
        triggered: 'replication_lag',
        pid: child.pid,
        applied_at: new Date(),
        note: 'Hot-doc hammering. Lag builds over ~2 min.'
    };
}

export async function reset() {
    if (!fs.existsSync(PID_FILE)) {
        console.log('ℹ️  No replication lag PID file found');
        return await cleanupData();
    }

    const pid = parseInt(fs.readFileSync(PID_FILE, 'utf-8'));
    try {
        process.kill(pid, 'SIGTERM');
        console.log(`📤 SIGTERM sent to PID ${pid}, waiting 5s for graceful shutdown...`);
        await new Promise(r => setTimeout(r, 5000));
        try {
            process.kill(pid, 0);
            process.kill(pid, 'SIGKILL');
            console.log(`💀 Force killed PID ${pid}`);
        } catch {
            console.log(`✅ PID ${pid} terminated cleanly`);
        }
    } catch {
        console.log(`ℹ️  Replication lag process ${pid} not running`);
    }
    fs.unlinkSync(PID_FILE);
    return await cleanupData();
}

async function cleanupData() {
    const { getAppClient } = await import('../../config/mongo.js');
    const client = await getAppClient();
    const db = client.db(process.env.MONGODB_DB);
    const result = await db.collection('orders').updateMany(
        { hot_counter: { $exists: true } },
        { $unset: { hot_counter: '', activity_log: '' } }
    );
    console.log(`✅ Reset: cleared hot_counter from ${result.modifiedCount} docs`);
    return { reset: 'replication_lag', docs_cleaned: result.modifiedCount };
}