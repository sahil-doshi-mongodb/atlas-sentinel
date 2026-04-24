import 'dotenv/config';
import { MongoClient } from 'mongodb';

const clients = [];
const NUM_CONNECTIONS = 60;   // was 100

console.log(`[${new Date().toISOString()}] Starting ${NUM_CONNECTIONS} long-running connections...`);

for (let i = 0; i < NUM_CONNECTIONS; i++) {
    const c = new MongoClient(process.env.MONGODB_APP_URI, {
        maxPoolSize: 1,
        serverSelectionTimeoutMS: 10000,
    });
    await c.connect();
    clients.push(c);
}
console.log(`[${new Date().toISOString()}] All ${NUM_CONNECTIONS} connections established`);

// Re-fire moderately expensive aggregations every 12s (slower cycle, smaller scope)
async function fireRound() {
    for (const c of clients) {
        c.db(process.env.MONGODB_DB).collection('orders').aggregate([
            { $match: { status: 'shipped' } },
            { $group: { _id: '$product_id', count: { $sum: 1 }, total: { $sum: '$amount' } } },
            { $sort: { total: -1 } },
            { $limit: 50 },
        ], { allowDiskUse: true }).toArray().catch(() => { });
    }
}

await fireRound();
const interval = setInterval(fireRound, 12000);

process.on('SIGTERM', async () => {
    console.log(`[${new Date().toISOString()}] SIGTERM received, closing connections...`);
    clearInterval(interval);
    for (const c of clients) await c.close().catch(() => { });
    process.exit(0);
});

process.on('SIGINT', async () => {
    clearInterval(interval);
    for (const c of clients) await c.close().catch(() => { });
    process.exit(0);
});