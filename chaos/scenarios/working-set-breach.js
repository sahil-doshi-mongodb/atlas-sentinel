import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PID_FILE = path.join(__dirname, '../.working-set-breach.pid');

export async function trigger() {
    const workerPath = path.join(__dirname, 'working-set-breach-worker.js');
    const logPath = path.join(__dirname, '../.working-set-breach.log');
    const out = fs.openSync(logPath, 'a');

    const child = spawn('node', [workerPath], {
        detached: true,
        stdio: ['ignore', out, out],
        env: process.env,
    });
    child.unref();

    fs.writeFileSync(PID_FILE, String(child.pid));
    console.log(`💥 CHAOS: Working set breach worker spawned (PID ${child.pid})`);
    console.log(`   Logs: ${logPath}`);
    return {
        triggered: 'working_set_breach',
        pid: child.pid,
        applied_at: new Date(),
        note: 'Embeddings written in background, vector index built after. ~3-4 min to fully manifest.'
    };
}

export async function reset() {
    if (fs.existsSync(PID_FILE)) {
        const pid = parseInt(fs.readFileSync(PID_FILE, 'utf-8'));
        try {
            process.kill(pid, 'SIGTERM');
            await new Promise(r => setTimeout(r, 3000));
            try {
                process.kill(pid, 0);
                process.kill(pid, 'SIGKILL');
            } catch { }
            console.log(`✅ Worker PID ${pid} terminated`);
        } catch {
            console.log(`ℹ️  Worker ${pid} not running`);
        }
        fs.unlinkSync(PID_FILE);
    }

    const { getAppClient } = await import('../../config/mongo.js');
    const client = await getAppClient();
    const db = client.db(process.env.MONGODB_DB);
    const coll = db.collection('orders');

    try {
        await coll.dropSearchIndex('orders_vector_chaos');
        console.log('✅ Dropped vector index');
    } catch (err) {
        if (!err.message.includes('not exist') && !err.message.includes('does not exist')) {
            console.log('ℹ️ ', err.message);
        }
    }

    const result = await coll.updateMany(
        { embedding: { $exists: true } },
        { $unset: { embedding: '' } }
    );
    console.log(`✅ Reset: removed embeddings from ${result.modifiedCount} docs`);
    return { reset: 'working_set_breach', docs_cleaned: result.modifiedCount };
}