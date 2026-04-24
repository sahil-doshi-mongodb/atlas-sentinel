import { getAppClient } from '../../config/mongo.js';

export async function trigger() {
    const client = await getAppClient();
    const db = client.db(process.env.MONGODB_DB);
    const coll = db.collection('orders');

    console.log('💥 CHAOS: Backfilling 1024-dim embeddings on 50K docs...');

    // Backfill embeddings on a subset to bloat working set quickly
    const docs = await coll.find({ embedding: { $exists: false } }).limit(50_000).project({ _id: 1 }).toArray();
    console.log(`   processing ${docs.length} docs in batches of 1000...`);

    for (let i = 0; i < docs.length; i += 1000) {
        const batch = docs.slice(i, i + 1000).map(d => ({
            updateOne: {
                filter: { _id: d._id },
                update: { $set: { embedding: Array.from({ length: 1024 }, () => Math.random()) } },
            },
        }));
        await coll.bulkWrite(batch);
        if (i % 10000 === 0) process.stdout.write('.');
    }

    console.log('\n   creating vector search index (chaos)...');
    try {
        await coll.createSearchIndex({
            name: 'orders_vector_chaos',
            type: 'vectorSearch',
            definition: {
                fields: [{ type: 'vector', path: 'embedding', numDimensions: 1024, similarity: 'cosine' }],
            },
        });
    } catch (err) {
        if (!err.message.includes('already exists')) throw err;
    }

    return { triggered: 'working_set_breach', applied_at: new Date(), note: 'Vector index takes ~2 min to build' };
}

export async function reset() {
    const client = await getAppClient();
    const db = client.db(process.env.MONGODB_DB);
    const coll = db.collection('orders');
    try { await coll.dropSearchIndex('orders_vector_chaos'); } catch { }
    await coll.updateMany({ embedding: { $exists: true } }, { $unset: { embedding: '' } });
    console.log('✅ Reset: vector index dropped, embeddings cleared');
    return { reset: 'working_set_breach' };
}