import 'dotenv/config';
import { MongoClient } from 'mongodb';

const client = new MongoClient(process.env.MONGODB_APP_URI, { maxPoolSize: 5 });
await client.connect();
const coll = client.db(process.env.MONGODB_DB).collection('orders');

const target = await coll.findOne({});
console.log(`[${new Date().toISOString()}] Hammering doc ${target._id} every 100ms with 100 updates per round`);

const interval = setInterval(async () => {
    const ops = Array.from({ length: 100 }, () => ({
        updateOne: {
            filter: { _id: target._id },
            update: {
                $inc: { hot_counter: 1 },
                $push: { activity_log: { ts: new Date(), data: 'x'.repeat(500) } },
            },
        },
    }));
    await coll.bulkWrite(ops, { ordered: false }).catch(() => { });
}, 100);

process.on('SIGTERM', async () => {
    console.log(`[${new Date().toISOString()}] SIGTERM received, stopping...`);
    clearInterval(interval);
    await client.close().catch(() => { });
    process.exit(0);
});

process.on('SIGINT', async () => {
    clearInterval(interval);
    await client.close().catch(() => { });
    process.exit(0);
});