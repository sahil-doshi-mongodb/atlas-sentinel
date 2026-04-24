import { getDb } from '../config/mongo.js';

export async function get_server_status() {
    const db = await getDb('agent');
    const status = await db.admin().serverStatus();
    return {
        uptime_sec: status.uptime,
        connections: status.connections,
        opcounters: status.opcounters,
        wiredTiger: {
            cache_used_mb: Math.round(status.wiredTiger?.cache?.['bytes currently in the cache'] / 1024 / 1024),
            cache_max_mb: Math.round(status.wiredTiger?.cache?.['maximum bytes configured'] / 1024 / 1024),
            pages_read_into_cache: status.wiredTiger?.cache?.['pages read into cache'],
            pages_evicted: status.wiredTiger?.cache?.['unmodified pages evicted'],
        },
        network: status.network,
        mem: status.mem,
    };
}

export async function get_current_op({ active = true, secs_running_min = 1 } = {}) {
    const db = await getDb('agent');
    const result = await db.admin().command({
        currentOp: 1,
        active,
        secs_running: { $gte: secs_running_min },
    });
    return {
        in_progress_count: result.inprog.length,
        operations: result.inprog.slice(0, 20).map(op => ({
            opid: op.opid,
            ns: op.ns,
            op: op.op,
            secs_running: op.secs_running,
            planSummary: op.planSummary,
            command: JSON.stringify(op.command).slice(0, 200),
        })),
    };
}

export async function get_index_stats({ collection }) {
    const db = await getDb('agent');
    const stats = await db.collection(collection).aggregate([
        { $indexStats: {} }
    ]).toArray();
    return stats.map(s => ({
        name: s.name,
        accesses: s.accesses,
        spec: s.spec,
    }));
}

export async function get_coll_stats({ collection }) {
    const db = await getDb('agent');
    const [stats] = await db.collection(collection).aggregate([
        { $collStats: { storageStats: { scale: 1024 * 1024 } } }
    ]).toArray();
    return {
        collection,
        count: stats.storageStats.count,
        size_mb: stats.storageStats.size,
        storage_size_mb: stats.storageStats.storageSize,
        total_index_size_mb: stats.storageStats.totalIndexSize,
        avg_obj_size_bytes: stats.storageStats.avgObjSize,
        nindexes: stats.storageStats.nindexes,
        index_sizes_mb: Object.fromEntries(
            Object.entries(stats.storageStats.indexSizes || {})
        ),
    };
}

export async function explain_query({ collection, filter, sort, limit = 10 }) {
    const db = await getDb('agent');
    const cursor = db.collection(collection).find(filter || {});
    if (sort) cursor.sort(sort);
    cursor.limit(limit);
    const explanation = await cursor.explain('executionStats');
    const exec = explanation.executionStats;
    return {
        winningPlan: explanation.queryPlanner.winningPlan.stage,
        indexUsed: explanation.queryPlanner.winningPlan.inputStage?.indexName || 'COLLSCAN',
        docs_examined: exec.totalDocsExamined,
        docs_returned: exec.nReturned,
        examined_to_returned_ratio: exec.nReturned ? Math.round(exec.totalDocsExamined / exec.nReturned) : null,
        execution_ms: exec.executionTimeMillis,
        rejected_plans_count: explanation.queryPlanner.rejectedPlans?.length || 0,
    };
}

export async function sample_schema({ collection, n = 5 }) {
    const db = await getDb('agent');
    const docs = await db.collection(collection).aggregate([
        { $sample: { size: n } }
    ]).toArray();
    return docs.map(d => {
        const shape = {};
        for (const [k, v] of Object.entries(d)) {
            shape[k] = Array.isArray(v) ? `array[${v.length}]` :
                v === null ? 'null' :
                    typeof v === 'object' ? 'object' :
                        typeof v;
        }
        return shape;
    });
}

export async function get_replication_status() {
    const db = await getDb('agent');
    try {
        const status = await db.admin().command({ replSetGetStatus: 1 });
        const primary = status.members.find(m => m.stateStr === 'PRIMARY');
        const secondaries = status.members.filter(m => m.stateStr === 'SECONDARY');
        return {
            set: status.set,
            primary_uptime_sec: primary?.uptime,
            secondaries: secondaries.map(s => ({
                name: s.name,
                lag_seconds: primary ? Math.round((primary.optimeDate - s.optimeDate) / 1000) : null,
                health: s.health,
            })),
        };
    } catch (e) {
        return { error: e.message };
    }
}