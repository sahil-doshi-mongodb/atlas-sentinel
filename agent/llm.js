import axios from 'axios';

const GROVE_URL = `${process.env.GROVE_BASE_URL}/messages`;

export async function callBedrock({ system, messages, tools = [], model = 'fast' }) {
    // Function name kept as 'callBedrock' so orchestrator.js doesn't need changes
    const modelName = model === 'fast'
        ? process.env.GROVE_MODEL_FAST
        : process.env.GROVE_MODEL_SMART;

    const body = {
        model: modelName,
        max_tokens: 2048,
        messages,
        ...(system && { system }),
        ...(tools.length && { tools }),
    };

    try {
        const { data } = await axios.post(GROVE_URL, body, {
            headers: {
                'Content-Type': 'application/json',
                'anthropic-version': '2023-06-01',
                'api-key': process.env.GROVE_API_KEY,
            },
            timeout: 60_000,
        });
        return data;
    } catch (err) {
        const detail = err.response?.data || err.message;
        throw new Error(`Grove API error: ${JSON.stringify(detail)}`);
    }
}