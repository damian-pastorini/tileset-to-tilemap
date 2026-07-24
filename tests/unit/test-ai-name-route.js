const { TestRunner, assert } = require('../test-runner');
const { AiNameRoute } = require('../../lib/routes/ai-name');
const { TestFixtures } = require('../test-fixtures');

class TestAiNameRoute
{
    constructor()
    {
        this.runner = new TestRunner();
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
            let res = TestFixtures.buildJsonMockRes();
            await route.handle(TestFixtures.buildAiRequestWithoutNullKeys({sessionId: null}), res);
            assert.ok(res.body);
            assert.ok(res.body.error);
        });
        await this.runner.test('returns error when imageId missing', async () => {
            let route = new AiNameRoute('/root');
            let res = TestFixtures.buildJsonMockRes();
            await route.handle(TestFixtures.buildAiRequestWithoutNullKeys({imageId: null}), res);
            assert.ok(res.body.error);
        });
        await this.runner.test('returns error when provider missing', async () => {
            let route = new AiNameRoute('/root');
            let res = TestFixtures.buildJsonMockRes();
            await route.handle(TestFixtures.buildAiRequestWithoutNullKeys({provider: null}), res);
            assert.ok(res.body.error);
        });
        await this.runner.test('returns empty elements array when elements input is empty', async () => {
            let route = new AiNameRoute('/root');
            let res = TestFixtures.buildJsonMockRes();
            await route.handle(TestFixtures.buildAiRequestWithoutNullKeys({elements: []}), res);
            assert.ok(res.body);
            assert.ok(Array.isArray(res.body.elements));
            assert.strictEqual(res.body.elements.length, 0);
        });
    }
}

module.exports.TestAiNameRoute = TestAiNameRoute;
