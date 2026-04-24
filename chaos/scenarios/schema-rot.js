import { getAppClient } from '../../config/mongo.js';

export async function trigger() {
    const client = await getAppClient();
    const db = client.db(process.env.MONGODB_DB);
    const coll = db.collection('orders');

    console.log('💥 CHAOS: Bloating documents with massive arrays...');

    // Pick 100 docs and grow them with huge arrays
    const targets = await coll.find({}).limit(100).project({ _id: 1 }).toArray();

    for (const t of targets) {
        const huge = Array.from({ length: 30_000 }, (_, i) => ({
            event: `evt_${i}`,
            payload: 'x'.repeat(100),
        }));
        await coll.updateOne({ _id: t._id }, { $set: { activity_history: huge } });
    }

    console.log('✅ Bloated 100 docs with 30K-entry arrays');
    return { triggered: 'schema_rot', applied_at: new Date() };
}

export async function reset() {
    const client = await getAppClient();
    const db = client.db(process.env.MONGODB_DB);
    await db.collection('orders').updateMany(
        { activity_history: { $exists: true } },
        { $unset: { activity_history: '' } }
    );
    console.log('✅ Reset: bloated arrays removed');
    return { reset: 'schema_rot' };
}