let { TestRunner, assert } = require('../lib/test-runner');
let { AiProviderCaller } = require('../../lib/ai-provider-caller');

class TestAiProviderCaller
{
    constructor()
    {
        this.runner = new TestRunner();
        this.caller = new AiProviderCaller();
    }

    async testGetMaxTokens()
    {
        this.runner.suite('AiProviderCaller');
        this.runner.group('getMaxTokens');
        await this.runner.test('ollama naming returns 0', () => {
            assert.strictEqual(this.caller.getMaxTokens('ollama', false), 0);
        });
        await this.runner.test('ollama detection returns 0', () => {
            assert.strictEqual(this.caller.getMaxTokens('ollama', true), 0);
        });
        await this.runner.test('ollama:model variant returns 0', () => {
            assert.strictEqual(this.caller.getMaxTokens('ollama:qwen2.5vl:7b', false), 0);
        });
        await this.runner.test('claude naming default is 512', () => {
            let saved = process.env.CLAUDE_MAX_TOKENS;
            delete process.env.CLAUDE_MAX_TOKENS;
            let result = this.caller.getMaxTokens('claude', false);
            if(saved !== undefined){ process.env.CLAUDE_MAX_TOKENS = saved; }
            assert.strictEqual(result, 512);
        });
        await this.runner.test('claude detection default is 4096', () => {
            let saved = process.env.CLAUDE_MAX_TOKENS_DETECTION;
            delete process.env.CLAUDE_MAX_TOKENS_DETECTION;
            let result = this.caller.getMaxTokens('claude', true);
            if(saved !== undefined){ process.env.CLAUDE_MAX_TOKENS_DETECTION = saved; }
            assert.strictEqual(result, 4096);
        });
        await this.runner.test('claude naming reads custom env value', () => {
            let saved = process.env.CLAUDE_MAX_TOKENS;
            process.env.CLAUDE_MAX_TOKENS = '1024';
            let result = this.caller.getMaxTokens('claude', false);
            if(saved !== undefined){ process.env.CLAUDE_MAX_TOKENS = saved; }
            if(saved === undefined){ delete process.env.CLAUDE_MAX_TOKENS; }
            assert.strictEqual(result, 1024);
        });
        await this.runner.test('gemini naming default is 512', () => {
            let saved = process.env.GEMINI_MAX_TOKENS;
            delete process.env.GEMINI_MAX_TOKENS;
            let result = this.caller.getMaxTokens('gemini', false);
            if(saved !== undefined){ process.env.GEMINI_MAX_TOKENS = saved; }
            assert.strictEqual(result, 512);
        });
        await this.runner.test('gemini detection default is 4096', () => {
            let saved = process.env.GEMINI_MAX_TOKENS_DETECTION;
            delete process.env.GEMINI_MAX_TOKENS_DETECTION;
            let result = this.caller.getMaxTokens('gemini', true);
            if(saved !== undefined){ process.env.GEMINI_MAX_TOKENS_DETECTION = saved; }
            assert.strictEqual(result, 4096);
        });
        await this.runner.test('unknown provider naming default is 512', () => {
            let result = this.caller.getMaxTokens('unknown-provider', false);
            assert.strictEqual(result, 512);
        });
    }
}

module.exports.TestAiProviderCaller = TestAiProviderCaller;
