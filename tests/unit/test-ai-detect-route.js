let { TestRunner, assert } = require('../lib/test-runner');
let { AiDetectRoute } = require('../../lib/routes/ai-detect');

class TestAiDetectRoute
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
        this.runner.suite('AiDetectRoute');
        this.runner.group('constructor');
        await this.runner.test('stores rootDir', () => {
            let route = new AiDetectRoute('/my/root');
            assert.strictEqual(route.rootDir, '/my/root');
        });
    }

    async testHandle()
    {
        this.runner.group('handle');
        await this.runner.test('returns error when sessionId missing', async () => {
            let route = new AiDetectRoute('/root');
            let res = this.buildMockRes();
            await route.handle({body: {imageId: 'img.png', provider: 'claude'}}, res);
            assert.ok(res.body);
            assert.ok(res.body.error);
        });
        await this.runner.test('returns error when imageId missing', async () => {
            let route = new AiDetectRoute('/root');
            let res = this.buildMockRes();
            await route.handle({body: {sessionId: 'sess', provider: 'claude'}}, res);
            assert.ok(res.body.error);
        });
        await this.runner.test('returns error when provider missing', async () => {
            let route = new AiDetectRoute('/root');
            let res = this.buildMockRes();
            await route.handle({body: {sessionId: 'sess', imageId: 'img.png'}}, res);
            assert.ok(res.body.error);
        });
    }
}

module.exports.TestAiDetectRoute = TestAiDetectRoute;
