import express from 'express';
import { getAgentClient } from '../config/mongo.js';

const router = express.Router();

router.get('/health', async (req, res) => {
    try {
        const client = await getAgentClient();
        const db = client.db(process.env.MONGODB_DB);
        const status = await db.admin().serverStatus();

        const cacheUsedMB = Math.round(status.wiredTiger?.cache?.['bytes currently in the cache'] / 1024 / 1024) || 0;
        const cacheMaxMB = Math.round(status.wiredTiger?.cache?.['maximum bytes configured'] / 1024 / 1024) || 0;

        // Compute rough opcounter sample
        const opcounters = status.opcounters || {};
        const totalOps = Object.values(opcounters).reduce((a, b) => a + b, 0);

        // Determine health label
        let healthLabel = 'HEALTHY';
        if (status.connections.current > 250 || cacheUsedMB / cacheMaxMB > 0.85) {
            healthLabel = 'DEGRADED';
        }
        if (status.connections.current > 400 || cacheUsedMB / cacheMaxMB > 0.95) {
            healthLabel = 'CRITICAL';
        }

        res.json({
            label: healthLabel,
            connections: {
                current: status.connections.current,
                active: status.connections.active,
                available: status.connections.available,
            },
            opcounters,
            total_ops_lifetime: totalOps,
            cache: {
                used_mb: cacheUsedMB,
                max_mb: cacheMaxMB,
                utilization_pct: cacheMaxMB ? Math.round((cacheUsedMB / cacheMaxMB) * 100) : 0,
            },
            uptime_sec: status.uptime,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;