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
            process.env.OLLAMA_HOST = 'http://myhost:9999';
            let req = new Requirements();
            assert.ok(req.ollamaTagsUrl.includes('myhost:9999'));
            delete process.env.OLLAMA_HOST;
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
            let savedClaude = process.env.ANTHROPIC_API_KEY;
            let savedGemini = process.env.GEMINI_API_KEY;
            process.env.ANTHROPIC_API_KEY = 'test-key';
            delete process.env.GEMINI_API_KEY;
            let req = new Requirements();
            req.ollamaTagsUrl = 'http://localhost:19999/api/tags';
            let result = await req.resolveAiProviders();
            assert.ok(result.includes('claude'));
            process.env.ANTHROPIC_API_KEY = savedClaude;
            process.env.GEMINI_API_KEY = savedGemini;
        });
        await this.runner.test('includes gemini when GEMINI_API_KEY set', async () => {
            let savedClaude = process.env.ANTHROPIC_API_KEY;
            let savedGemini = process.env.GEMINI_API_KEY;
            delete process.env.ANTHROPIC_API_KEY;
            process.env.GEMINI_API_KEY = 'test-key';
            let req = new Requirements();
            req.ollamaTagsUrl = 'http://localhost:19999/api/tags';
            let result = await req.resolveAiProviders();
            assert.ok(result.includes('gemini'));
            process.env.ANTHROPIC_API_KEY = savedClaude;
            process.env.GEMINI_API_KEY = savedGemini;
        });
    }
}

module.exports.TestRequirements = TestRequirements;
