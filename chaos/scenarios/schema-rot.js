import { getAppClient } from '../../config/mongo.js';

export async function trigger() {
    const client = await getAppClient();
    const db = client.db(process.env.MONGODB_DB);
    const coll = db.collection('orders');

    console.log('💥 CHAOS: Bloating 50 documents with massive arrays...');

    // Smaller blast radius (50 docs) but still very visible in stats
    const targets = await coll.find({}).limit(50).project({ _id: 1 }).toArray();
    console.log(`   Target docs: ${targets.length}`);

    // Build the huge array once, reuse
    const huge = Array.from({ length: 30_000 }, (_, i) => ({
        event: `evt_${i}`,
        payload: 'x'.repeat(100),
    }));

    // Parallel bulkWrite — way faster
    const ops = targets.map(t => ({
        updateOne: {
            filter: { _id: t._id },
            update: { $set: { activity_history: huge } },
        },
    }));

    console.log('   Writing bloat in parallel...');
    const start = Date.now();
    const result = await coll.bulkWrite(ops, { ordered: false });
    const elapsed = Math.round((Date.now() - start) / 1000);

    console.log(`✅ Bloated ${result.modifiedCount} docs with 30K-entry arrays in ${elapsed}s`);
    return { triggered: 'schema_rot', applied_at: new Date(), affected: result.modifiedCount };
}

export async function reset() {
    const client = await getAppClient();
    const db = client.db(process.env.MONGODB_DB);
    const result = await db.collection('orders').updateMany(
        { activity_history: { $exists: true } },
        { $unset: { activity_history: '' } }
    );
    console.log(`✅ Reset: removed bloat from ${result.modifiedCount} docs`);
    return { reset: 'schema_rot' };
}