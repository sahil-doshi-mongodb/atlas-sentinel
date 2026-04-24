import * as atlas from '../config/atlas.js';

const DESIRED_METRICS = [
    'OPCOUNTER_QUERY',
    'OPCOUNTER_INSERT',
    'OPCOUNTER_UPDATE',
    'CONNECTIONS',
    'CACHE_BYTES_READ_INTO',
    'CACHE_DIRTY_BYTES',
    'TICKETS_AVAILABLE_READS',
    'TICKETS_AVAILABLE_WRITES',
    'QUERY_TARGETING_SCANNED_OBJECTS_PER_RETURNED',
    'SYSTEM_NORMALIZED_CPU_USER',
];

export async function get_cluster_metrics({ period_minutes = 15 } = {}) {
    const processes = await atlas.getProcesses();
    const primary = processes.results.find(p => p.typeName === 'REPLICA_PRIMARY');
    if (!primary) return { error: 'No primary found' };

    // Try the full set first; if any is rejected, fall back to fetching individually
    let measurements;
    try {
        const result = await atlas.getProcessMeasurements(
            primary.id, 'PT1M', `PT${period_minutes}M`
        );
        measurements = result.measurements;
    } catch (err) {
        // Fallback: fetch one metric at a time, skip invalid ones
        measurements = [];
        for (const m of DESIRED_METRICS) {
            try {
                const result = await atlas.getProcessMeasurementsCustom(
                    primary.id, 'PT1M', `PT${period_minutes}M`, [m]
                );
                if (result.measurements?.length) measurements.push(...result.measurements);
            } catch {
                // Skip unsupported metric
            }
        }
    }

    const summary = {};
    for (const m of measurements) {
        const points = (m.dataPoints || []).filter(p => p.value !== null);
        if (!points.length) continue;
        const values = points.map(p => p.value);
        summary[m.name] = {
            latest: values[values.length - 1],
            max: Math.max(...values),
            avg: Math.round(values.reduce((a, b) => a + b, 0) / values.length * 100) / 100,
            trend: values[values.length - 1] > values[0] * 1.5 ? 'rising sharply' :
                values[values.length - 1] > values[0] * 1.1 ? 'rising' :
                    values[values.length - 1] < values[0] * 0.9 ? 'falling' : 'stable',
        };
    }
    return summary;
}

export async function get_slow_queries({ since_minutes = 15, limit = 10 } = {}) {
    const processes = await atlas.getProcesses();
    const primary = processes.results.find(p => p.typeName === 'REPLICA_PRIMARY');
    const since = Date.now() - since_minutes * 60_000;
    const logs = await atlas.getSlowQueryLogs(primary.id, since);

    return (logs.slowQueries || []).slice(0, limit).map(q => ({
        namespace: q.namespace,
        duration_ms: q.line?.match(/(\d+)ms/)?.[1] || null,
        excerpt: q.line?.slice(0, 250),
    }));
}

export async function get_index_suggestions() {
    const processes = await atlas.getProcesses();
    const primary = processes.results.find(p => p.typeName === 'REPLICA_PRIMARY');
    return atlas.getSuggestedIndexes(primary.id);
}

export async function get_open_alerts() {
    const alerts = await atlas.getOpenAlerts();
    return (alerts.results || []).map(a => ({
        id: a.id,
        eventTypeName: a.eventTypeName,
        status: a.status,
        created: a.created,
        metricName: a.metricName,
        currentValue: a.currentValue,
    }));
}