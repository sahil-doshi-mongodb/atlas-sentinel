import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PID_FILE = path.join(__dirname, '../.connection-storm.pid');

export async function trigger() {
    // Spawn a detached worker that holds the 100 connections
    const workerPath = path.join(__dirname, 'connection-storm-worker.js');
    const logPath = path.join(__dirname, '../.connection-storm.log');
    const out = fs.openSync(logPath, 'a');

    const child = spawn('node', [workerPath], {
        detached: true,
        stdio: ['ignore', out, out],
        env: process.env,
    });
    child.unref();

    fs.writeFileSync(PID_FILE, String(child.pid));
    console.log(`💥 CHAOS: Connection storm worker spawned (PID ${child.pid})`);
    console.log(`   Logs: ${logPath}`);
    return { triggered: 'connection_storm', pid: child.pid, applied_at: new Date() };
}

export async function reset() {
    if (!fs.existsSync(PID_FILE)) {
        console.log('ℹ️  No storm PID file found');
        return { reset: 'connection_storm' };
    }
    const pid = parseInt(fs.readFileSync(PID_FILE, 'utf-8'));
    try {
        process.kill(pid, 'SIGTERM');
        console.log(`📤 SIGTERM sent to PID ${pid}, waiting 5s for graceful shutdown...`);
        await new Promise(r => setTimeout(r, 5000));
        // Force kill if still alive
        try {
            process.kill(pid, 0);  // probe — throws if dead
            process.kill(pid, 'SIGKILL');
            console.log(`💀 Force killed PID ${pid}`);
        } catch {
            console.log(`✅ PID ${pid} terminated cleanly`);
        }
    } catch (err) {
        console.log(`ℹ️  Storm process ${pid} not running`);
    }
    fs.unlinkSync(PID_FILE);
    return { reset: 'connection_storm' };
}