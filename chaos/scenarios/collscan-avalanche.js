import { getAppClient } from '../../config/mongo.js';

export async function trigger() {
    const client = await getAppClient();
    const db = client.db(process.env.MONGODB_DB);
    const coll = db.collection('orders');

    try {
        await coll.dropIndex('customer_id_1');
        console.log('💥 CHAOS: Dropped customer_id_1 index');
        return { triggered: 'collscan_avalanche', applied_at: new Date() };
    } catch (err) {
        if (err.code === 27 || err.message.includes('index not found')) {
            console.log('ℹ️  Index already dropped');
            return { triggered: 'collscan_avalanche', already_applied: true };
        }
        throw err;
    }
}

export async function reset() {
    const client = await getAppClient();
    const db = client.db(process.env.MONGODB_DB);
    await db.collection('orders').createIndex({ customer_id: 1 });
    console.log('✅ Reset: customer_id_1 index restored');
    return { reset: 'collscan_avalanche' };
}