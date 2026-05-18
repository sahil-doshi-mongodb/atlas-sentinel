import express from 'express';

const SCENARIOS = {
    'collscan_avalanche': () => import('../chaos/scenarios/collscan-avalanche.js'),
    'working_set_breach': () => import('../chaos/scenarios/working-set-breach.js'),
    'connection_storm': () => import('../chaos/scenarios/connection-storm.js'),
    'schema_rot': () => import('../chaos/scenarios/schema-rot.js'),
    'replication_lag': () => import('../chaos/scenarios/replication-lag.js'),
};

const COOLDOWN_SECONDS = {
    'collscan_avalanche': 60,
    'connection_storm': 60,
    'schema_rot': 30,
    'replication_lag': 120,
    'working_set_breach': 240,
};

// In-memory cooldown state: { scenarioName: cooldownUntilTimestampMs }
const cooldowns = new Map();

function getActiveCooldowns() {
    const now = Date.now();
    const active = {};
    for (const [scenario, until] of cooldowns.entries()) {
        if (until > now) {
            active[scenario] = {
                seconds_remaining: Math.ceil((until - now) / 1000),
                cooldown_until: until,
            };
        } else {
            cooldowns.delete(scenario);
        }
    }
    return active;
}

const router = express.Router();

router.post('/:scenario/trigger', async (req, res) => {
    const loader = SCENARIOS[req.params.scenario];
    if (!loader) return res.status(404).json({ error: 'Unknown scenario' });

    const cooldownSec = COOLDOWN_SECONDS[req.params.scenario] || 60;

    // Set cooldown OPTIMISTICALLY so UI updates instantly
    // (even before the trigger() body finishes)
    cooldowns.set(req.params.scenario, Date.now() + cooldownSec * 1000);

    try {
        const mod = await loader();
        const result = await mod.trigger();
        res.json({ ...result, cooldown_seconds: cooldownSec });
    } catch (err) {
        // Roll back cooldown on failure
        cooldowns.delete(req.params.scenario);
        res.status(500).json({ error: err.message });
    }
});

router.post('/:scenario/reset', async (req, res) => {
    const loader = SCENARIOS[req.params.scenario];
    if (!loader) return res.status(404).json({ error: 'Unknown scenario' });
    try {
        const mod = await loader();
        const result = await mod.reset();
        cooldowns.delete(req.params.scenario);
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
    cooldowns.clear();
    res.json(results);
});

router.get('/cooldown-status', (req, res) => {
    const active = getActiveCooldowns();
    const maxSecondsRemaining = Object.values(active).reduce(
        (max, c) => Math.max(max, c.seconds_remaining), 0
    );
    res.json({
        cooldowns: active,
        has_active_cooldowns: Object.keys(active).length > 0,
        max_seconds_remaining: maxSecondsRemaining,
    });
});

router.get('/list', (req, res) => {
    res.json({ scenarios: Object.keys(SCENARIOS) });
});

export default router;