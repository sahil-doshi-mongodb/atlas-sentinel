async function refreshHealth() {
    try {
        const res = await fetch('/api/cluster/health');
        if (!res.ok) throw new Error('Health check failed');
        const data = await res.json();

        document.getElementById('m-connections').textContent = data.connections.current;
        document.getElementById('m-connections-detail').textContent =
            `${data.connections.active} active · ${data.connections.available} available`;

        document.getElementById('m-cache').textContent = `${data.cache.utilization_pct}%`;
        document.getElementById('m-cache-detail').textContent =
            `${data.cache.used_mb} / ${data.cache.max_mb} MB`;

        const ops = data.opcounters;
        document.getElementById('m-ops').textContent = data.total_ops_lifetime.toLocaleString();
        document.getElementById('m-ops-detail').textContent =
            `Q:${(ops.query || 0).toLocaleString()} I:${(ops.insert || 0).toLocaleString()} U:${(ops.update || 0).toLocaleString()}`;

        const hours = Math.floor(data.uptime_sec / 3600);
        const mins = Math.floor((data.uptime_sec % 3600) / 60);
        document.getElementById('m-uptime').textContent = `${hours}h ${mins}m`;
        document.getElementById('m-uptime-detail').textContent = 'since cluster start';

        const badge = document.getElementById('health-badge');
        badge.textContent = data.label;
        badge.className = `badge ${data.label.toLowerCase()}`;

        document.querySelectorAll('.metric-card').forEach(c => {
            c.style.borderLeftColor =
                data.label === 'CRITICAL' ? 'var(--red)' :
                    data.label === 'DEGRADED' ? 'var(--amber)' :
                        'var(--green)';
        });
    } catch (err) {
        console.error('Health refresh error:', err);
    }
}

setInterval(refreshHealth, 5000);
refreshHealth();