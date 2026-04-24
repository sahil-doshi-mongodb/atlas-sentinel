import 'dotenv/config';
import axios from 'axios';

try {
    const { data } = await axios.post(
        'https://api.voyageai.com/v1/embeddings',
        { input: ['test diagnostic query'], model: 'voyage-3-large', input_type: 'query' },
        { headers: { Authorization: `Bearer ${process.env.VOYAGE_API_KEY}` } }
    );
    console.log('✅ Voyage: got embedding of dim', data.data[0].embedding.length);
    console.log('   First 5 values:', data.data[0].embedding.slice(0, 5));
} catch (err) {
    console.error('❌ Voyage failed:', err.response?.data || err.message);
}