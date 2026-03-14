let { TestRunner, assert } = require('../lib/test-runner');
let { AiAssignLayersRoute } = require('../../lib/routes/ai-assign-layers');

class TestAiAssignLayersRoute
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
        this.runner.suite('AiAssignLayersRoute');
        this.runner.group('constructor');
        await this.runner.test('stores rootDir', () => {
            let route = new AiAssignLayersRoute('/my/root');
            assert.strictEqual(route.rootDir, '/my/root');
        });
    }

    async testHandle()
    {
        this.runner.group('handle');
        await this.runner.test('returns error when sessionId missing', async () => {
            let route = new AiAssignLayersRoute('/root');
            let res = this.buildMockRes();
            await route.handle({body: {imageId: 'img.png', provider: 'claude'}}, res);
            assert.ok(res.body);
            assert.ok(res.body.error);
        });
        await this.runner.test('returns error when imageId missing', async () => {
            let route = new AiAssignLayersRoute('/root');
            let res = this.buildMockRes();
            await route.handle({body: {sessionId: 'sess', provider: 'claude'}}, res);
            assert.ok(res.body.error);
        });
        await this.runner.test('returns error when provider missing', async () => {
            let route = new AiAssignLayersRoute('/root');
            let res = this.buildMockRes();
            await route.handle({body: {sessionId: 'sess', imageId: 'img.png'}}, res);
            assert.ok(res.body.error);
        });
        await this.runner.test('returns empty layers when elementTiles is empty and params valid', async () => {
            let route = new AiAssignLayersRoute('/root');
            let res = this.buildMockRes();
            await route.handle({body: {sessionId: 'sess', imageId: 'img.png', provider: 'claude', elementTiles: []}}, res);
            assert.ok(res.body);
            assert.ok(Array.isArray(res.body.layers));
            assert.strictEqual(res.body.layers.length, 0);
        });
    }
}

module.exports.TestAiAssignLayersRoute = TestAiAssignLayersRoute;
