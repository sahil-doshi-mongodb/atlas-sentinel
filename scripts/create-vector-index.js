import 'dotenv/config';
import { getAppClient, closeAll } from '../config/mongo.js';

const client = await getAppClient();
const coll = client.db(process.env.MONGODB_DB).collection('past_incidents');

try {
    await coll.createSearchIndex({
        name: 'incidents_vector_index',
        type: 'vectorSearch',
        definition: {
            fields: [
                { type: 'vector', path: 'embedding', numDimensions: 1024, similarity: 'cosine' },
            ],
        },
    });
    console.log('✅ Vector index creation initiated.');
    console.log('⏳ Provisioning takes 1-2 minutes...');
    console.log('   Check status in Atlas UI: Cluster → Atlas Search tab');
    console.log('   Wait until status shows "Active" (green)');
} catch (err) {
    if (err.message.includes('already exists') || err.code === 68) {
        console.log('ℹ️  Index already exists');
    } else {
        console.error('❌', err.message);
    }
}
await closeAll();