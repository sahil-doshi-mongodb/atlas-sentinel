import { getAppClient } from '../../config/mongo.js';

export async function trigger() {
    const client = await getAppClient();
    const db = client.db(process.env.MONGODB_DB);
    const coll = db.collection('orders');

    console.log('💥 CHAOS: Backfilling 1024-dim embeddings on 30K docs...');

    const docs = await coll.find({ embedding: { $exists: false } })
        .limit(30_000)
        .project({ _id: 1 })
        .toArray();
    console.log(`   Target docs: ${docs.length}`);

    const start = Date.now();
    const BATCH_SIZE = 500;

    for (let i = 0; i < docs.length; i += BATCH_SIZE) {
        const batch = docs.slice(i, i + BATCH_SIZE).map(d => ({
            updateOne: {
                filter: { _id: d._id },
                update: { $set: { embedding: Array.from({ length: 1024 }, () => Math.random()) } },
            },
        }));
        await coll.bulkWrite(batch, { ordered: false });
        process.stdout.write('.');
    }

    const writeTime = Math.round((Date.now() - start) / 1000);
    console.log(`\n   Backfilled embeddings in ${writeTime}s`);

    console.log('   Creating vector search index (chaos)...');
    try {
        await coll.createSearchIndex({
            name: 'orders_vector_chaos',
            type: 'vectorSearch',
            definition: {
                fields: [{ type: 'vector', path: 'embedding', numDimensions: 1024, similarity: 'cosine' }],
            },
        });
        console.log('   Vector index creation initiated (~2 min build time)');
    } catch (err) {
        if (!err.message.includes('already exists')) throw err;
        console.log('   ℹ️  Vector index already exists');
    }

    return {
        triggered: 'working_set_breach',
        applied_at: new Date(),
        write_seconds: writeTime,
        note: 'Vector index takes ~2 min to fully build',
    };
}

export async function reset() {
    const client = await getAppClient();
    const db = client.db(process.env.MONGODB_DB);
    const coll = db.collection('orders');

    try {
        await coll.dropSearchIndex('orders_vector_chaos');
        console.log('✅ Dropped vector index');
    } catch (err) {
        if (!err.message.includes('not exist')) console.log('ℹ️ ', err.message);
    }

    const result = await coll.updateMany(
        { embedding: { $exists: true } },
        { $unset: { embedding: '' } }
    );
    console.log(`✅ Reset: removed embeddings from ${result.modifiedCount} docs`);
    return { reset: 'working_set_breach' };
}