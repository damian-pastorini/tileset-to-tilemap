let { TestRunner, assert } = require('../lib/test-runner');
let { AiNameRoute } = require('../../lib/routes/ai-name');

class TestAiNameRoute
{
    constructor()
    {
        this.runner = new TestRunner();
    }

    buildMockRes()
    {
        let mock = {};
        mock.statusCode = null;
        mock.body = null;
        mock.status = (code) => { mock.statusCode = code; return mock; };
        mock.json = (data) => { mock.body = data; };
        return mock;
    }

    async testConstructor()
    {
        this.runner.suite('AiNameRoute');
        this.runner.group('constructor');
        await this.runner.test('stores rootDir', () => {
            let route = new AiNameRoute('/my/root');
            assert.strictEqual(route.rootDir, '/my/root');
        });
    }

    async testHandle()
    {
        this.runner.group('handle');
        await this.runner.test('returns error when sessionId missing', async () => {
            let route = new AiNameRoute('/root');
            let res = this.buildMockRes();
            await route.handle({body: {imageId: 'img.png', provider: 'claude'}}, res);
            assert.ok(res.body);
            assert.ok(res.body.error);
        });
        await this.runner.test('returns error when imageId missing', async () => {
            let route = new AiNameRoute('/root');
            let res = this.buildMockRes();
            await route.handle({body: {sessionId: 'sess', provider: 'claude'}}, res);
            assert.ok(res.body.error);
        });
        await this.runner.test('returns error when provider missing', async () => {
            let route = new AiNameRoute('/root');
            let res = this.buildMockRes();
            await route.handle({body: {sessionId: 'sess', imageId: 'img.png'}}, res);
            assert.ok(res.body.error);
        });
        await this.runner.test('returns empty elements array when elements input is empty', async () => {
            let route = new AiNameRoute('/root');
            let res = this.buildMockRes();
            await route.handle({body: {sessionId: 'sess', imageId: 'img.png', provider: 'claude', elements: []}}, res);
            assert.ok(res.body);
            assert.ok(Array.isArray(res.body.elements));
            assert.strictEqual(res.body.elements.length, 0);
        });
    }
}

module.exports.TestAiNameRoute = TestAiNameRoute;
