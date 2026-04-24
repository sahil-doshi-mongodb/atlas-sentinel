import 'dotenv/config';
import fs from 'fs';
import axios from 'axios';
import { getAppClient, closeAll } from '../config/mongo.js';

const SLEEP_MS = 21_000; // 3 RPM = one every 20s, add 1s buffer

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function embed(text, attempt = 1) {
    try {
        const { data } = await axios.post(
            'https://api.voyageai.com/v1/embeddings',
            { input: [text], model: 'voyage-3-large', input_type: 'document' },
            { headers: { Authorization: `Bearer ${process.env.VOYAGE_API_KEY}` } }
        );
        return data.data[0].embedding;
    } catch (err) {
        if (err.response?.status === 429 && attempt < 4) {
            console.log(`   ⏳ rate limited, waiting 30s (attempt ${attempt})...`);
            await sleep(30_000);
            return embed(text, attempt + 1);
        }
        throw err;
    }
}

const incidents = JSON.parse(fs.readFileSync('./data/past_incidents.json', 'utf-8'));
const client = await getAppClient();
const coll = client.db(process.env.MONGODB_DB).collection('past_incidents');

// Resume support: only embed incidents not already in DB
const existing = await coll.distinct('incident_id');
const remaining = incidents.filter(i => !existing.includes(i.incident_id));

console.log(`Total: ${incidents.length}, already done: ${existing.length}, remaining: ${remaining.length}`);
console.log(`At 3 RPM, this will take ~${Math.ceil(remaining.length * SLEEP_MS / 60_000)} min\n`);

for (let i = 0; i < remaining.length; i++) {
    const inc = remaining[i];
    const text = `${inc.title}. ${inc.symptoms}. ${inc.diagnosis}`;
    const embedding = await embed(text);
    await coll.insertOne({ ...inc, embedding });
    console.log(`✓ [${i + 1}/${remaining.length}] ${inc.incident_id}: ${inc.title}`);

    // Sleep BEFORE next iteration (skip after last)
    if (i < remaining.length - 1) await sleep(SLEEP_MS);
}

console.log(`\n✅ Done. Total in DB: ${await coll.countDocuments()}`);
await closeAll();