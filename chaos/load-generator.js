import 'dotenv/config';
import { getAppClient } from '../config/mongo.js';

const COLL = 'orders';

async function run() {
    const client = await getAppClient();
    const db = client.db(process.env.MONGODB_DB);
    const orders = db.collection(COLL);

    console.log('🔄 Load generator running. Ctrl-C to stop.\n');

    // Inserter — 50 docs/sec
    setInterval(async () => {
        const STATUSES = ['pending', 'shipped', 'delivered'];
        const docs = Array.from({ length: 50 }, () => ({
            customer_id: Math.floor(Math.random() * 10_000),
            product_id: Math.floor(Math.random() * 1000),
            amount: Math.round(Math.random() * 1000 * 100) / 100,
            status: STATUSES[Math.floor(Math.random() * 3)],
            created_at: new Date(),
        }));
        try { await orders.insertMany(docs); } catch { }
    }, 1000);

    // Mixed query workload
    setInterval(async () => {
        const r = Math.random();
        try {
            if (r < 0.7) {
                // Indexed query
                await orders.find({ customer_id: Math.floor(Math.random() * 10_000) }).limit(20).toArray();
            } else if (r < 0.95) {
                // Date range
                const since = new Date(Date.now() - Math.random() * 3600_000);
                await orders.find({ created_at: { $gte: since } }).limit(50).toArray();
            } else {
                // Aggregation
                await orders.aggregate([
                    { $match: { status: 'shipped' } },
                    { $group: { _id: '$customer_id', total: { $sum: '$amount' } } },
                    { $sort: { total: -1 } },
                    { $limit: 10 },
                ]).toArray();
            }
        } catch { }
    }, 100);

    let lastCount = 0;
    setInterval(async () => {
        const count = await orders.estimatedDocumentCount();
        const rate = count - lastCount;
        process.stdout.write(`\r📊 Total docs: ${count.toLocaleString()} (+${rate}/10s)   `);
        lastCount = count;
    }, 10_000);
}

run().catch(console.error);