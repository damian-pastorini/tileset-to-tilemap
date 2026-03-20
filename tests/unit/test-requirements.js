let { TestRunner, assert } = require('../lib/test-runner');
let { Requirements } = require('../../lib/requirements');

class TestRequirements
{
    constructor()
    {
        this.runner = new TestRunner();
    }

    async testConstructor()
    {
        this.runner.suite('Requirements');
        this.runner.group('constructor');
        await this.runner.test('sets ollamaTagsUrl from default host', () => {
            let savedHost = process.env.OLLAMA_HOST;
            delete process.env.OLLAMA_HOST;
            let req = new Requirements();
            assert.ok(req.ollamaTagsUrl.includes('localhost:11434'));
            assert.ok(req.ollamaTagsUrl.endsWith('/api/tags'));
            process.env.OLLAMA_HOST = savedHost;
        });
        await this.runner.test('sets ollamaTagsUrl from env OLLAMA_HOST', () => {
            let req = new Requirements({ollamaHost: 'http://myhost:9999'});
            assert.ok(req.ollamaTagsUrl.includes('myhost:9999'));
        });
    }

    async testCheckOllama()
    {
        this.runner.group('checkOllama');
        await this.runner.test('returns false when Ollama unreachable', async () => {
            let req = new Requirements();
            req.ollamaTagsUrl = 'http://localhost:19999/api/tags';
            let result = await req.checkOllama();
            assert.strictEqual(result, false);
        });
    }

    async testResolveAiProviders()
    {
        this.runner.group('resolveAiProviders');
        await this.runner.test('returns an array', async () => {
            let savedClaude = process.env.ANTHROPIC_API_KEY;
            let savedGemini = process.env.GEMINI_API_KEY;
            delete process.env.ANTHROPIC_API_KEY;
            delete process.env.GEMINI_API_KEY;
            let req = new Requirements();
            req.ollamaTagsUrl = 'http://localhost:19999/api/tags';
            let result = await req.resolveAiProviders();
            assert.ok(Array.isArray(result));
            process.env.ANTHROPIC_API_KEY = savedClaude;
            process.env.GEMINI_API_KEY = savedGemini;
        });
        await this.runner.test('includes claude when ANTHROPIC_API_KEY set', async () => {
            let req = new Requirements({anthropicApiKey: 'test-key', ollamaHost: 'http://localhost:19999'});
            let result = await req.resolveAiProviders();
            assert.ok(result.includes('claude'));
        });
        await this.runner.test('includes gemini when GEMINI_API_KEY set', async () => {
            let req = new Requirements({geminiApiKey: 'test-key', ollamaHost: 'http://localhost:19999'});
            let result = await req.resolveAiProviders();
            assert.ok(result.includes('gemini'));
        });
    }
}

module.exports.TestRequirements = TestRequirements;
