import express from 'express';
import { diagnose } from '../agent/orchestrator.js';

const router = express.Router();

router.post('/', async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const emit = (event) => {
        res.write(`data: ${JSON.stringify({ ...event, ts: Date.now() })}\n\n`);
    };

    try {
        const userQuery = req.body?.query ||
            'Run a comprehensive health check on the cluster. Look for any anomalies in metrics, indexes, or schema.';

        await diagnose({ userQuery, emit });
        emit({ type: 'done' });
    } catch (err) {
        emit({ type: 'error', error: err.message });
    } finally {
        res.end();
    }
});

export default router;