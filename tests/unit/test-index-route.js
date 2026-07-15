const { TestRunner, assert } = require('../test-runner');
const { IndexRoute } = require('../../lib/routes/index');

class TestIndexRoute
{
    constructor()
    {
        this.runner = new TestRunner();
    }

    async testConstructor()
    {
        this.runner.suite('IndexRoute');
        this.runner.group('constructor');
        await this.runner.test('showAiControls true maps to "1"', () => {
            let route = new IndexRoute(true, [], '/public');
            assert.strictEqual(route.showAiControls, '1');
        });
        await this.runner.test('showAiControls false maps to "0"', () => {
            let route = new IndexRoute(false, [], '/public');
            assert.strictEqual(route.showAiControls, '0');
        });
        await this.runner.test('showAiControls undefined maps to "0"', () => {
            let route = new IndexRoute(undefined, [], '/public');
            assert.strictEqual(route.showAiControls, '0');
        });
        await this.runner.test('activeProviders joined with comma', () => {
            let route = new IndexRoute(true, ['claude', 'gemini'], '/public');
            assert.strictEqual(route.activeProviders, 'claude,gemini');
        });
        await this.runner.test('single provider produces no trailing comma', () => {
            let route = new IndexRoute(true, ['ollama'], '/public');
            assert.strictEqual(route.activeProviders, 'ollama');
        });
        await this.runner.test('empty activeProviders produces empty string', () => {
            let route = new IndexRoute(false, [], '/public');
            assert.strictEqual(route.activeProviders, '');
        });
        await this.runner.test('null activeProviders produces empty string', () => {
            let route = new IndexRoute(false, null, '/public');
            assert.strictEqual(route.activeProviders, '');
        });
        await this.runner.test('publicDir is stored', () => {
            let route = new IndexRoute(false, [], '/my/public');
            assert.strictEqual(route.publicDir, '/my/public');
        });
        await this.runner.test('publicDir defaults to "public" when not provided', () => {
            let route = new IndexRoute(false, []);
            assert.strictEqual(route.publicDir, 'public');
        });
    }
}

module.exports.TestIndexRoute = TestIndexRoute;
