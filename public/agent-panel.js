const traceEl = document.getElementById('trace');
const reportEl = document.getElementById('report-section');
const reportBody = document.getElementById('report-body');
const diagBtn = document.getElementById('diagnose-btn');
const timerEl = document.getElementById('diag-timer');

function clearTrace() {
    traceEl.innerHTML = '';
    traceEl.scrollTop = 0;
    reportEl.classList.add('hidden');
    reportBody.innerHTML = '';
}

function appendTrace(item) {
    const div = document.createElement('div');
    div.className = `trace-item ${item.type}`;

    const stepTag = item.step ? `<span class="step-tag">step ${item.step}</span>` : '';

    if (item.type === 'thinking' || item.type === 'synthesizing') {
        div.innerHTML = `${stepTag}🧠 ${escapeHtml(item.text)}`;
    } else if (item.type === 'model_thinking') {
        div.innerHTML = `${stepTag}<span class="model-tag">${item.model}</span> <span class="thinking-pulse">thinking…</span>`;
        div.id = `thinking-${item.step}`;
    } else if (item.type === 'model_done') {
        const old = document.getElementById(`thinking-${item.step}`);
        if (old) {
            const tokens = item.input_tokens
                ? ` · ${item.input_tokens} in / ${item.output_tokens} out`
                : '';
            old.innerHTML = `${stepTag}<span class="model-tag">${item.model}</span> <span class="thinking-done">responded in ${item.latency_ms}ms${tokens}</span>`;
            old.classList.add('done');
        }
        return;
    } else if (item.type === 'reasoning') {
        div.innerHTML = `${stepTag}💭 ${escapeHtml(item.text)}`;
    } else if (item.type === 'tool_call') {
        const inputStr = JSON.stringify(item.input || {}, null, 2);
        div.innerHTML = `${stepTag}→ <span class="tool-name">${item.tool}</span><pre class="tool-input-block">${escapeHtml(inputStr)}</pre>`;
    } else if (item.type === 'tool_result') {
        const summary = (item.result_summary || '').slice(0, 250);
        const full = item.result_full || '';
        const id = `result-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        div.innerHTML = `
      ${stepTag}✓ <span class="tool-name">${item.tool}</span>: ${escapeHtml(summary)}
      ${full ? `<button class="expand-btn" onclick="document.getElementById('${id}').classList.toggle('hidden')">▸ raw</button>
      <pre id="${id}" class="result-full hidden">${escapeHtml(full)}</pre>` : ''}
    `;
    } else if (item.type === 'tool_error') {
        div.innerHTML = `${stepTag}✗ <span class="tool-name">${item.tool}</span>: ${escapeHtml(item.error)}`;
    } else if (item.type === 'final') {
        renderReport(item.report);
        return;
    } else {
        return;
    }

    // Only auto-scroll if user is already at the bottom (within 80px tolerance)
    const isAtBottom = traceEl.scrollHeight - traceEl.scrollTop - traceEl.clientHeight < 80;
    traceEl.appendChild(div);
    if (isAtBottom) {
        traceEl.scrollTop = traceEl.scrollHeight;
    }
}

function renderReport(r) {
    reportEl.classList.remove('hidden');

    const sevClass = r.severity || 'LOW';
    const evidence = (r.evidence || []).map(e => `<li>${escapeHtml(e)}</li>`).join('');
    const remediation = (r.remediation_steps || []).map(s => `
    <div class="remediation-step">
      <div class="action">${escapeHtml(s.action || '')}</div>
      ${s.code ? `<pre><code>${escapeHtml(s.code)}</code></pre>` : ''}
      ${s.estimated_impact ? `<div class="impact">Impact: ${escapeHtml(s.estimated_impact)}</div>` : ''}
    </div>
  `).join('');
    const incidents = (r.similar_past_incidents || []).map(i => `<code>${escapeHtml(i)}</code>`).join(', ') || '<em>none</em>';
    const confidencePct = Math.round((r.confidence || 0) * 100);

    reportBody.innerHTML = `
    <div class="severity-banner severity-${sevClass}">
      ${sevClass}: ${escapeHtml(r.root_cause || 'Diagnosis incomplete')}
    </div>

    <div class="report-section">
      <h3>Evidence</h3>
      <ul>${evidence}</ul>
    </div>

    <div class="report-section">
      <h3>Remediation</h3>
      ${remediation}
    </div>

    <div class="report-meta">

    <div class="report-meta">
      <div>
        Similar past incidents: ${incidents}
      </div>
      <div>
        Confidence:
        <span class="confidence-bar"><span class="confidence-bar-fill" style="width:${confidencePct}%"></span></span>
        ${confidencePct}%
      </div>
    </div>
  `;

    // Only auto-jump to report if user hasn't scrolled the trace manually
    const traceAtBottom = traceEl.scrollHeight - traceEl.scrollTop - traceEl.clientHeight < 100;
    if (traceAtBottom) {
        reportEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function escapeHtml(s) {
    if (!s) return '';
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

diagBtn.onclick = async () => {
    clearTrace();
    diagBtn.disabled = true;
    diagBtn.textContent = '🔍 Diagnosing...';

    const start = Date.now();
    const tickInterval = setInterval(() => {
        const elapsed = Math.round((Date.now() - start) / 1000);
        timerEl.textContent = `${elapsed}s`;
    }, 100);

    try {
        const res = await fetch('/api/diagnose', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
        });

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const events = buffer.split('\n\n');
            buffer = events.pop();
            for (const event of events) {
                if (event.startsWith('data: ')) {
                    try {
                        appendTrace(JSON.parse(event.slice(6)));
                    } catch (err) {
                        console.error('Parse error:', err, event);
                    }
                }
            }
        }
    } catch (err) {
        appendTrace({ type: 'tool_error', tool: 'diagnose', error: err.message });
    } finally {
        clearInterval(tickInterval);
        diagBtn.disabled = false;
        diagBtn.textContent = '🔍 Diagnose Cluster';
    }
};