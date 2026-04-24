import 'dotenv/config';
import { getAgentClient, getAppClient, closeAll } from '../config/mongo.js';

console.log('Testing connections...\n');

try {
    const agentClient = await getAgentClient();
    const agentDb = agentClient.db(process.env.MONGODB_DB);
    const ping = await agentDb.admin().ping();
    console.log('✅ Agent connection:', ping);

    const appClient = await getAppClient();
    const appDb = appClient.db(process.env.MONGODB_DB);
    await appDb.collection('test').insertOne({ test: true, ts: new Date() });
    const count = await appDb.collection('test').countDocuments();
    console.log('✅ App connection: inserted, count =', count);
    await appDb.collection('test').drop();

    console.log('\n🎉 All connections working!');
} catch (err) {
    console.error('❌ Connection failed:', err.message);
} finally {
    await closeAll();
}