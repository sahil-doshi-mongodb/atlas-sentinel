import 'dotenv/config';
import axios from 'axios';
import { getAgentClient, closeAll } from '../config/mongo.js';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function embed(text, attempt = 1) {
    try {
        const { data } = await axios.post(
            'https://api.voyageai.com/v1/embeddings',
            { input: [text], model: 'voyage-3-large', input_type: 'query' },
            { headers: { Authorization: `Bearer ${process.env.VOYAGE_API_KEY}` } }
        );
        return data.data[0].embedding;
    } catch (err) {
        if (err.response?.status === 429 && attempt < 4) {
            console.log(`⏳ Rate limited, waiting ${attempt * 25}s...`);
            await sleep(attempt * 25_000);
            return embed(text, attempt + 1);
        }
        throw err;
    }
}

const queryText = 'p99 latency spike, working set exceeded RAM, vector index added recently';
console.log('Query:', queryText, '\n');

const queryEmbedding = await embed(queryText);

const client = await getAgentClient();
const coll = client.db(process.env.MONGODB_DB).collection('past_incidents');

const results = await coll.aggregate([
    {
        $vectorSearch: {
            index: 'incidents_vector_index',
            path: 'embedding',
            queryVector: queryEmbedding,
            numCandidates: 50,
            limit: 3,
        },
    },
    {
        $project: {
            _id: 0,
            incident_id: 1,
            title: 1,
            score: { $meta: 'vectorSearchScore' },
        },
    },
]).toArray();

console.log('Top matches:');
if (results.length === 0) {
    console.log('  ⚠️  No results — check if vector index status is "Active" in Atlas UI');
} else {
    results.forEach(r => console.log(`  [${r.score.toFixed(3)}] ${r.incident_id}: ${r.title}`));
}

await closeAll();