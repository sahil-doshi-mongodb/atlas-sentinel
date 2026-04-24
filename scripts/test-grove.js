import 'dotenv/config';
import { callBedrock } from '../agent/llm.js';

try {
    console.log('Testing Haiku 4.5 via Grove...');
    const fast = await callBedrock({
        system: 'You are a helpful assistant.',
        messages: [{ role: 'user', content: 'Say hi in 5 words.' }],
        model: 'fast',
    });
    console.log('✅ Haiku:', fast.content[0].text);
    console.log('   tokens:', fast.usage);

    console.log('\nTesting Sonnet 4.5 via Grove...');
    const smart = await callBedrock({
        system: 'You are a helpful assistant.',
        messages: [{ role: 'user', content: 'Say hi in 5 words.' }],
        model: 'smart',
    });
    console.log('✅ Sonnet:', smart.content[0].text);
    console.log('   tokens:', smart.usage);
} catch (err) {
    console.error('❌ Grove failed:', err.message);
}