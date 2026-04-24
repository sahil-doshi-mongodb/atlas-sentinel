import { MongoClient } from 'mongodb';

let agentClient;
let appClient;

export async function getAgentClient() {
  if (!agentClient) {
    agentClient = new MongoClient(process.env.MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 30000,
    });
    await agentClient.connect();
    console.log('✅ Agent (read-only) client connected');
  }
  return agentClient;
}

export async function getAppClient() {
  if (!appClient) {
    appClient = new MongoClient(process.env.MONGODB_APP_URI, {
      maxPoolSize: 20,
    });
    await appClient.connect();
    console.log('✅ App (read/write) client connected');
  }
  return appClient;
}

export async function getDb(role = 'agent') {
  const client = role === 'app' ? await getAppClient() : await getAgentClient();
  return client.db(process.env.MONGODB_DB);
}

export async function closeAll() {
  if (agentClient) await agentClient.close();
  if (appClient) await appClient.close();
}