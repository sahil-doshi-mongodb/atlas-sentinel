import 'dotenv/config';
import { getAppClient, closeAll } from '../config/mongo.js';

const client = await getAppClient();
const coll = client.db(process.env.MONGODB_DB).collection('orders');

console.log('Seeding 1M orders (this takes ~3 min)...');

const STATUSES = ['pending', 'shipped', 'delivered'];
const batch = [];

for (let i = 0; i < 1_000_000; i++) {
    batch.push({
        customer_id: Math.floor(Math.random() * 100_000),    // higher cardinality
        product_id: Math.floor(Math.random() * 1000),
        amount: Math.round(Math.random() * 1000 * 100) / 100,
        status: STATUSES[Math.floor(Math.random() * 3)],
        created_at: new Date(Date.now() - Math.random() * 30 * 86400_000),
        notes: 'x'.repeat(200),                              // bulk up doc size
    });
    if (batch.length >= 5000) {
        await coll.insertMany(batch);
        process.stdout.write('.');
        batch.length = 0;
    }
}
if (batch.length) await coll.insertMany(batch);

console.log('\n✅ Done. Count:', await coll.countDocuments());
await closeAll();