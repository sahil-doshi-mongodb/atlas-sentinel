import 'dotenv/config';
import { getAppClient, closeAll } from '../config/mongo.js';

const client = await getAppClient();
const db = client.db(process.env.MONGODB_DB);

console.log('Creating collections and indexes...');

// past_incidents collection
try { await db.createCollection('past_incidents'); } catch { }

// orders collection (load gen target)
try { await db.createCollection('orders'); } catch { }
await db.collection('orders').createIndex({ customer_id: 1 });
await db.collection('orders').createIndex({ created_at: -1 });
await db.collection('orders').createIndex({ status: 1 });

// analytics collection
try { await db.createCollection('analytics'); } catch { }

console.log('✅ Setup complete');
console.log('Collections:', (await db.listCollections().toArray()).map(c => c.name));

await closeAll();