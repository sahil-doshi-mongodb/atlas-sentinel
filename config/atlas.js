import DigestFetch from 'digest-fetch';

const BASE = 'https://cloud.mongodb.com/api/atlas/v2';

const client = new DigestFetch(
    process.env.ATLAS_PUBLIC_KEY,
    process.env.ATLAS_PRIVATE_KEY
);

async function call(path, params = {}) {
    const url = new URL(`${BASE}${path}`);
    for (const [k, v] of Object.entries(params)) {
        if (v === undefined || v === null) continue;
        if (Array.isArray(v)) {
            // Repeated query params: ?m=A&m=B&m=C
            v.forEach(item => url.searchParams.append(k, item));
        } else {
            url.searchParams.set(k, v);
        }
    }
    const res = await client.fetch(url.toString(), {
        headers: { Accept: 'application/vnd.atlas.2024-08-05+json' },
    });
    if (!res.ok) throw new Error(`Atlas API ${res.status}: ${await res.text()}`);
    return res.json();
}

export async function getProcesses() {
    return call(`/groups/${process.env.ATLAS_GROUP_ID}/processes`);
}

export async function getProcessMeasurements(host, granularity = 'PT1M', period = 'PT15M') {
    return call(
        `/groups/${process.env.ATLAS_GROUP_ID}/processes/${host}/measurements`,
        {
            granularity,
            period,
            m: [
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
            ],
        }
    );
}

export async function getProcessMeasurementsCustom(host, granularity, period, metricsArray) {
    return call(
        `/groups/${process.env.ATLAS_GROUP_ID}/processes/${host}/measurements`,
        { granularity, period, m: metricsArray }
    );
}

export async function getSlowQueryLogs(host, since) {
    return call(
        `/groups/${process.env.ATLAS_GROUP_ID}/processes/${host}/performanceAdvisor/slowQueryLogs`,
        { since }
    );
}

export async function getSuggestedIndexes(host) {
    return call(
        `/groups/${process.env.ATLAS_GROUP_ID}/processes/${host}/performanceAdvisor/suggestedIndexes`
    );
}

export async function getOpenAlerts() {
    return call(`/groups/${process.env.ATLAS_GROUP_ID}/alerts`, { status: 'OPEN' });
}