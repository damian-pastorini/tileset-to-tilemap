const { TestRunner, assert } = require('../test-runner');
const { TestFixtures } = require('../test-fixtures');
const { AiDetectRoute } = require('../../lib/routes/ai-detect');

class TestAiDetectRoute
{
    constructor()
    {
        this.runner = new TestRunner();
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
            let res = TestFixtures.buildJsonMockRes();
            await route.handle({body: TestFixtures.buildAiRequestBody({sessionId: ''})}, res);
            assert.ok(res.body);
            assert.ok(res.body.error);
        });
        await this.runner.test('returns error when imageId missing', async () => {
            let route = new AiDetectRoute('/root');
            let res = TestFixtures.buildJsonMockRes();
            await route.handle({body: TestFixtures.buildAiRequestBody({imageId: ''})}, res);
            assert.ok(res.body.error);
        });
        await this.runner.test('returns error when provider missing', async () => {
            let route = new AiDetectRoute('/root');
            let res = TestFixtures.buildJsonMockRes();
            await route.handle({body: TestFixtures.buildAiRequestBody({provider: ''})}, res);
            assert.ok(res.body.error);
        });
    }
}

module.exports.TestAiDetectRoute = TestAiDetectRoute;
