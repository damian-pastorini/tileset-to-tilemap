const { TestRunner, assert } = require('../test-runner');
const { AiProviderCaller } = require('../../lib/ai-provider-caller');

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
            let result = new AiProviderCaller().getMaxTokens('claude', false);
            assert.strictEqual(result, 512);
        });
        await this.runner.test('claude detection default is 4096', () => {
            let result = new AiProviderCaller().getMaxTokens('claude', true);
            assert.strictEqual(result, 4096);
        });
        await this.runner.test('claude naming reads custom env value', () => {
            let caller = new AiProviderCaller({claudeMaxTokens: 1024});
            let result = caller.getMaxTokens('claude', false);
            assert.strictEqual(result, 1024);
        });
        await this.runner.test('gemini naming default is 512', () => {
            let result = new AiProviderCaller().getMaxTokens('gemini', false);
            assert.strictEqual(result, 512);
        });
        await this.runner.test('gemini detection default is 4096', () => {
            let result = new AiProviderCaller().getMaxTokens('gemini', true);
            assert.strictEqual(result, 4096);
        });
        await this.runner.test('unknown provider naming default is 512', () => {
            let result = this.caller.getMaxTokens('unknown-provider', false);
            assert.strictEqual(result, 512);
        });
    }
}

module.exports.TestAiProviderCaller = TestAiProviderCaller;
