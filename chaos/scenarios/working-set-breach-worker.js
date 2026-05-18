import 'dotenv/config';
import { MongoClient } from 'mongodb';

const client = new MongoClient(process.env.MONGODB_APP_URI, { maxPoolSize: 10 });
await client.connect();
const coll = client.db(process.env.MONGODB_DB).collection('orders');

let shuttingDown = false;

const shutdown = async (sig) => {
    console.log(`[${new Date().toISOString()}] ${sig} received, stopping...`);
    shuttingDown = true;
    await client.close().catch(() => { });
    process.exit(0);
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

console.log(`[${new Date().toISOString()}] Backfilling 1024-dim embeddings on 30K docs...`);

const docs = await coll.find({ embedding: { $exists: false } })
    .limit(30_000)
    .project({ _id: 1 })
    .toArray();
console.log(`   Target docs: ${docs.length}`);

const BATCH_SIZE = 500;
const start = Date.now();
let written = 0;

for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    if (shuttingDown) {
        console.log('   Shutdown signal — stopping early');
        process.exit(0);
    }
    const batch = docs.slice(i, i + BATCH_SIZE).map(d => ({
        updateOne: {
            filter: { _id: d._id },
            update: { $set: { embedding: Array.from({ length: 1024 }, () => Math.random()) } },
        },
    }));
    try {
        await coll.bulkWrite(batch, { ordered: false });
        written += batch.length;
        if (i % 5000 === 0) {
            console.log(`   Wrote ${written}/${docs.length}...`);
        }
    } catch (err) {
        console.log(`   Batch write error (continuing): ${err.message}`);
    }
}

const writeTime = Math.round((Date.now() - start) / 1000);
console.log(`[${new Date().toISOString()}] Backfilled ${written} embeddings in ${writeTime}s`);

console.log('   Creating vector search index...');
try {
    await coll.createSearchIndex({
        name: 'orders_vector_chaos',
        type: 'vectorSearch',
        definition: {
            fields: [{ type: 'vector', path: 'embedding', numDimensions: 1024, similarity: 'cosine' }],
        },
    });
    console.log('   ✅ Vector index creation initiated (~2 min build time on Atlas side)');
} catch (err) {
    if (err.message.includes('already exists')) {
        console.log('   ℹ️  Vector index already exists');
    } else {
        console.log('   ❌ Vector index error:', err.message);
    }
}

console.log(`[${new Date().toISOString()}] Worker complete, idling...`);

// Stay alive until killed so reset can find the PID
setInterval(() => { }, 60_000);