import { getAppClient } from '../../config/mongo.js';

let lagInterval;

export async function trigger() {
    const client = await getAppClient();
    const db = client.db(process.env.MONGODB_DB);
    const coll = db.collection('orders');

    console.log('💥 CHAOS: Hammering one document to bloat oplog...');

    const target = await coll.findOne({});

    lagInterval = setInterval(async () => {
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

    return { triggered: 'replication_lag', applied_at: new Date(), note: 'Lag builds over 1-2 min' };
}

export async function reset() {
    if (lagInterval) clearInterval(lagInterval);
    const client = await getAppClient();
    const db = client.db(process.env.MONGODB_DB);
    await db.collection('orders').updateMany(
        { hot_counter: { $exists: true } },
        { $unset: { hot_counter: '', activity_log: '' } }
    );
    console.log('✅ Reset: hot counter cleared');
    return { reset: 'replication_lag' };
}