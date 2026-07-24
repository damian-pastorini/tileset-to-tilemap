const { TestRunner, assert } = require('../test-runner');
const { TestFixtures } = require('../test-fixtures');
const { AiAssignLayersRoute } = require('../../lib/routes/ai-assign-layers');

class TestAiAssignLayersRoute
{
    constructor()
    {
        this.runner = new TestRunner();
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
            let res = TestFixtures.buildJsonMockRes();
            await route.handle(TestFixtures.buildAiRequestWithoutNullKeys({sessionId: null}), res);
            assert.ok(res.body);
            assert.ok(res.body.error);
        });
        await this.runner.test('returns error when imageId missing', async () => {
            let route = new AiAssignLayersRoute('/root');
            let res = TestFixtures.buildJsonMockRes();
            await route.handle(TestFixtures.buildAiRequestWithoutNullKeys({imageId: null}), res);
            assert.ok(res.body.error);
        });
        await this.runner.test('returns error when provider missing', async () => {
            let route = new AiAssignLayersRoute('/root');
            let res = TestFixtures.buildJsonMockRes();
            await route.handle(TestFixtures.buildAiRequestWithoutNullKeys({provider: null}), res);
            assert.ok(res.body.error);
        });
        await this.runner.test('returns empty layers when elementTiles is empty and params valid', async () => {
            let route = new AiAssignLayersRoute('/root');
            let res = TestFixtures.buildJsonMockRes();
            await route.handle(TestFixtures.buildAiRequestWithoutNullKeys({elementTiles: []}), res);
            assert.ok(res.body);
            assert.ok(Array.isArray(res.body.layers));
            assert.strictEqual(res.body.layers.length, 0);
        });
    }
}

module.exports.TestAiAssignLayersRoute = TestAiAssignLayersRoute;
