const { TestRunner, assert } = require('../test-runner');
const { TestFixtures } = require('../test-fixtures');
const { SessionDeleteRoute } = require('../../lib/routes/session-delete');

class TestSessionDeleteRoute
{
    constructor()
    {
        this.runner = new TestRunner();
        this.route = new SessionDeleteRoute('/root');
    }

    buildRequest(overrides)
    {
        return {
            params: Object.assign({
                sessionId: 'session-001'
            }, overrides)
        };
    }

    async testHandle()
    {
        this.runner.suite('SessionDeleteRoute');
        this.runner.group('handle');
        await this.runner.test('rejects empty sessionId with 400', () => {
            let res = TestFixtures.buildJsonMockRes();
            this.route.handle(this.buildRequest({sessionId: ''}), res);
            assert.strictEqual(res.statusCode, 400);
            assert.strictEqual(res.body.success, false);
        });
        await this.runner.test('rejects sessionId containing forward slash', () => {
            let res = TestFixtures.buildJsonMockRes();
            this.route.handle(this.buildRequest({sessionId: 'a/b'}), res);
            assert.strictEqual(res.statusCode, 400);
        });
        await this.runner.test('rejects sessionId containing double dot', () => {
            let res = TestFixtures.buildJsonMockRes();
            this.route.handle(this.buildRequest({sessionId: '..'}), res);
            assert.strictEqual(res.statusCode, 400);
        });
        await this.runner.test('rejects sessionId containing backslash', () => {
            let res = TestFixtures.buildJsonMockRes();
            this.route.handle(this.buildRequest({sessionId: 'a\\b'}), res);
            assert.strictEqual(res.statusCode, 400);
        });
        await this.runner.test('rejects path traversal sequence', () => {
            let res = TestFixtures.buildJsonMockRes();
            this.route.handle(this.buildRequest({sessionId: '../etc/passwd'}), res);
            assert.strictEqual(res.statusCode, 400);
        });
    }
}

module.exports.TestSessionDeleteRoute = TestSessionDeleteRoute;
