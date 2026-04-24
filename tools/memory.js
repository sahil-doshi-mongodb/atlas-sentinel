import axios from 'axios';
import { getDb } from '../config/mongo.js';

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
            await sleep(attempt * 5000);
            return embed(text, attempt + 1);
        }
        throw err;
    }
}

export async function search_similar_incidents({ symptoms, k = 3 }) {
    const queryEmbedding = await embed(symptoms);
    const db = await getDb('agent');
    const results = await db.collection('past_incidents').aggregate([
        {
            $vectorSearch: {
                index: 'incidents_vector_index',
                path: 'embedding',
                queryVector: queryEmbedding,
                numCandidates: 50,
                limit: k,
            },
        },
        {
            $project: {
                _id: 0,
                incident_id: 1,
                title: 1,
                symptoms: 1,
                diagnosis: 1,
                remediation: 1,
                remediation_code: 1,
                partner_recommendation: 1,
                tags: 1,
                score: { $meta: 'vectorSearchScore' },
            },
        },
    ]).toArray();
    return results;
}