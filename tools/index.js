import * as dp from './data-plane.js';
import * as atlas from './atlas-admin.js';
import * as memory from './memory.js';
import * as partner from './partner.js';

export const TOOLS = {
    get_server_status: {
        description: 'Get current server status: connections, opcounters, WiredTiger cache stats, memory.',
        parameters: { type: 'object', properties: {} },
        fn: dp.get_server_status,
    },
    get_current_op: {
        description: 'Get currently running operations longer than secs_running_min seconds.',
        parameters: {
            type: 'object',
            properties: { secs_running_min: { type: 'number', default: 1 } },
        },
        fn: dp.get_current_op,
    },
    get_index_stats: {
        description: 'Get index usage statistics for a collection. Use to find unused or hot indexes.',
        parameters: {
            type: 'object',
            properties: { collection: { type: 'string' } },
            required: ['collection'],
        },
        fn: dp.get_index_stats,
    },
    get_coll_stats: {
        description: 'Get storage statistics for a collection: size, index sizes, doc count.',
        parameters: {
            type: 'object',
            properties: { collection: { type: 'string' } },
            required: ['collection'],
        },
        fn: dp.get_coll_stats,
    },
    explain_query: {
        description: 'Run explain on a query to see if it uses an index, COLLSCANs, or has bad selectivity.',
        parameters: {
            type: 'object',
            properties: {
                collection: { type: 'string' },
                filter: { type: 'object' },
                sort: { type: 'object' },
            },
            required: ['collection', 'filter'],
        },
        fn: dp.explain_query,
    },
    sample_schema: {
        description: 'Sample N documents and return their field shapes. Use to spot schema anti-patterns.',
        parameters: {
            type: 'object',
            properties: {
                collection: { type: 'string' },
                n: { type: 'number', default: 5 },
            },
            required: ['collection'],
        },
        fn: dp.sample_schema,
    },
    get_replication_status: {
        description: 'Get replica set status: primary, secondary lag, health.',
        parameters: { type: 'object', properties: {} },
        fn: dp.get_replication_status,
    },
    get_cluster_metrics: {
        description: 'Get Atlas cluster metrics summary over the last N minutes (CPU, cache, queries, connections).',
        parameters: {
            type: 'object',
            properties: { period_minutes: { type: 'number', default: 15 } },
        },
        fn: atlas.get_cluster_metrics,
    },
    get_slow_queries: {
        description: 'Get slow queries from Atlas Performance Advisor.',
        parameters: {
            type: 'object',
            properties: {
                since_minutes: { type: 'number', default: 15 },
                limit: { type: 'number', default: 10 },
            },
        },
        fn: atlas.get_slow_queries,
    },
    get_index_suggestions: {
        description: 'Get suggested indexes from Atlas Performance Advisor.',
        parameters: { type: 'object', properties: {} },
        fn: atlas.get_index_suggestions,
    },
    get_open_alerts: {
        description: 'Get open Atlas alerts.',
        parameters: { type: 'object', properties: {} },
        fn: atlas.get_open_alerts,
    },
    search_similar_incidents: {
        description: 'Vector search past incidents matching given symptoms. Use early to find prior art.',
        parameters: {
            type: 'object',
            properties: {
                symptoms: { type: 'string', description: 'Description of observed symptoms' },
                k: { type: 'number', default: 3 },
            },
            required: ['symptoms'],
        },
        fn: memory.search_similar_incidents,
    },
    recommend_partner_solution: {
        description: 'Recommend partner solutions (AWS/GCP/Azure/SI/ISV) for a diagnosed issue.',
        parameters: {
            type: 'object',
            properties: {
                issue_category: { type: 'string' },
                cloud_provider: { type: 'string' },
            },
            required: ['issue_category'],
        },
        fn: partner.recommend_partner_solution,
    },
    get_write_activity: {
        description: 'Sample server opcounters over a few seconds to compute real-time inserts/updates/deletes per second. Use this to detect write storms when Atlas metrics lag or to investigate replication lag root cause.',
        parameters: {
            type: 'object',
            properties: { sample_seconds: { type: 'number', default: 2 } },
        },
        fn: dp.get_write_activity,
    },
};

export function toolSchema() {
    return Object.entries(TOOLS).map(([name, t]) => ({
        name,
        description: t.description,
        input_schema: t.parameters,
    }));
}