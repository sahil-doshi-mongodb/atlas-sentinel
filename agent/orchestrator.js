import { callBedrock } from './llm.js';
import { TOOLS, toolSchema } from '../tools/index.js';
import { SYSTEM_PROMPT } from './prompts.js';

const MAX_STEPS = 10;

export async function diagnose({ userQuery, emit }) {
    const messages = [
        { role: 'user', content: userQuery },
    ];

    emit({ type: 'thinking', text: 'Starting diagnostic. Forming initial hypothesis...' });

    for (let step = 1; step <= MAX_STEPS; step++) {
        emit({ type: 'step_start', step });

        const response = await callBedrock({
            system: SYSTEM_PROMPT,
            messages,
            tools: toolSchema(),
            model: 'fast',
        });

        for (const block of response.content) {
            if (block.type === 'text' && block.text) {
                emit({ type: 'reasoning', step, text: block.text });
            }
        }

        const toolUses = response.content.filter(b => b.type === 'tool_use');

        if (!toolUses.length) {
            emit({ type: 'synthesizing', text: 'Forming final diagnosis with Sonnet...' });
            const finalReport = await synthesizeFinalReport(messages, response);
            emit({ type: 'final', report: finalReport });
            return finalReport;
        }

        messages.push({ role: 'assistant', content: response.content });

        const toolResults = await Promise.all(toolUses.map(async (use) => {
            emit({ type: 'tool_call', step, tool: use.name, input: use.input });

            try {
                const tool = TOOLS[use.name];
                if (!tool) throw new Error(`Unknown tool: ${use.name}`);
                const result = await tool.fn(use.input || {});

                emit({
                    type: 'tool_result',
                    step,
                    tool: use.name,
                    result_summary: summarize(result),
                });

                return {
                    type: 'tool_result',
                    tool_use_id: use.id,
                    content: JSON.stringify(result).slice(0, 4000),
                };
            } catch (err) {
                emit({ type: 'tool_error', step, tool: use.name, error: err.message });
                return {
                    type: 'tool_result',
                    tool_use_id: use.id,
                    is_error: true,
                    content: err.message,
                };
            }
        }));

        messages.push({ role: 'user', content: toolResults });
    }

    emit({ type: 'max_steps_reached' });
    return synthesizeFinalReport(messages, null);
}

async function synthesizeFinalReport(messages, lastResponse) {
    const synthesisMessages = [
        ...messages,
        {
            role: 'user',
            content: 'Based on all your investigation above, produce a final diagnostic report in this exact JSON format (no markdown, no commentary, just JSON):\n{\n  "severity": "CRITICAL | HIGH | MEDIUM | LOW",\n  "root_cause": "one-sentence root cause",\n  "evidence": ["bullet 1", "bullet 2"],\n  "remediation_steps": [\n    { "action": "...", "code": "...", "estimated_impact": "..." }\n  ],\n  "partner_recommendation": "...",\n  "similar_past_incidents": ["INC-..."],\n  "confidence": 0.0-1.0\n}\n\nFor similar_past_incidents: ONLY include incidents whose ROOT CAUSE matches your diagnosis. Do not include tangentially related incidents. Better to return [] than a weak match.',
        },
    ];

    const response = await callBedrock({
        system: 'You are a senior MongoDB Principal Engineer. Output only valid JSON, no markdown formatting.',
        messages: synthesisMessages,
        model: 'smart',
        tools: [],
    });

    const text = response.content.find(b => b.type === 'text')?.text || '{}';
    try {
        return JSON.parse(text.replace(/```json|```/g, '').trim());
    } catch {
        return { raw: text };
    }
}

function summarize(result) {
    const str = JSON.stringify(result);
    return str.length > 200 ? str.slice(0, 200) + '...' : str;
}