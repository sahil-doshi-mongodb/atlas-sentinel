import express from 'express';

const SCENARIOS = {
    'collscan_avalanche': () => import('../chaos/scenarios/collscan-avalanche.js'),
    'working_set_breach': () => import('../chaos/scenarios/working-set-breach.js'),
    'connection_storm': () => import('../chaos/scenarios/connection-storm.js'),
    'schema_rot': () => import('../chaos/scenarios/schema-rot.js'),
    'replication_lag': () => import('../chaos/scenarios/replication-lag.js'),
};

const router = express.Router();

router.post('/:scenario/trigger', async (req, res) => {
    const loader = SCENARIOS[req.params.scenario];
    if (!loader) return res.status(404).json({ error: 'Unknown scenario' });
    try {
        const mod = await loader();
        const result = await mod.trigger();
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/:scenario/reset', async (req, res) => {
    const loader = SCENARIOS[req.params.scenario];
    if (!loader) return res.status(404).json({ error: 'Unknown scenario' });
    try {
        const mod = await loader();
        const result = await mod.reset();
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/reset-all', async (req, res) => {
    const results = {};
    for (const [name, loader] of Object.entries(SCENARIOS)) {
        try {
            const mod = await loader();
            results[name] = await mod.reset();
        } catch (err) {
            results[name] = { error: err.message };
        }
    }
    res.json(results);
});

router.get('/list', (req, res) => {
    res.json({ scenarios: Object.keys(SCENARIOS) });
});

export default router;