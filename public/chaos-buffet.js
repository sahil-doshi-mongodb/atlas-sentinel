const statusEl = document.getElementById('chaos-status');

document.querySelectorAll('.chaos-btn').forEach(btn => {
    btn.onclick = async () => {
        const scenario = btn.dataset.scenario;
        btn.disabled = true;
        btn.classList.add('triggered');
        statusEl.textContent = `Triggering ${scenario}...`;

        try {
            const res = await fetch(`/api/chaos/${scenario}/trigger`, { method: 'POST' });
            const data = await res.json();
            statusEl.textContent = `✓ ${scenario} triggered. Wait ~60-120s for symptoms to manifest, then click Diagnose.`;
            console.log('Chaos triggered:', data);
        } catch (err) {
            statusEl.textContent = `✗ Failed: ${err.message}`;
            btn.classList.remove('triggered');
        } finally {
            setTimeout(() => { btn.disabled = false; }, 5000);
        }
    };
});

document.getElementById('reset-all-btn').onclick = async () => {
    const btn = document.getElementById('reset-all-btn');
    btn.disabled = true;
    statusEl.textContent = 'Resetting all chaos scenarios... (may take 30-60s)';

    try {
        const res = await fetch('/api/chaos/reset-all', { method: 'POST' });
        const data = await res.json();
        statusEl.textContent = '✓ All chaos reset. Cluster recovering.';
        document.querySelectorAll('.chaos-btn.triggered').forEach(b => b.classList.remove('triggered'));
        console.log('Reset all:', data);
    } catch (err) {
        statusEl.textContent = `✗ Reset failed: ${err.message}`;
    } finally {
        btn.disabled = false;
    }
};