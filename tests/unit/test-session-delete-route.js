let { TestRunner, assert } = require('../lib/test-runner');
let { SessionDeleteRoute } = require('../../lib/routes/session-delete');

class TestSessionDeleteRoute
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

    async testHandle()
    {
        this.runner.suite('SessionDeleteRoute');
        this.runner.group('handle');
        await this.runner.test('rejects empty sessionId with 400', () => {
            let route = new SessionDeleteRoute('/root');
            let res = this.buildMockRes();
            route.handle({params: {sessionId: ''}}, res);
            assert.strictEqual(res.statusCode, 400);
            assert.strictEqual(res.body.success, false);
        });
        await this.runner.test('rejects sessionId containing forward slash', () => {
            let route = new SessionDeleteRoute('/root');
            let res = this.buildMockRes();
            route.handle({params: {sessionId: 'a/b'}}, res);
            assert.strictEqual(res.statusCode, 400);
        });
        await this.runner.test('rejects sessionId containing double dot', () => {
            let route = new SessionDeleteRoute('/root');
            let res = this.buildMockRes();
            route.handle({params: {sessionId: '..'}}, res);
            assert.strictEqual(res.statusCode, 400);
        });
        await this.runner.test('rejects sessionId containing backslash', () => {
            let route = new SessionDeleteRoute('/root');
            let res = this.buildMockRes();
            route.handle({params: {sessionId: 'a\\b'}}, res);
            assert.strictEqual(res.statusCode, 400);
        });
        await this.runner.test('rejects path traversal sequence', () => {
            let route = new SessionDeleteRoute('/root');
            let res = this.buildMockRes();
            route.handle({params: {sessionId: '../etc/passwd'}}, res);
            assert.strictEqual(res.statusCode, 400);
        });
    }
}

module.exports.TestSessionDeleteRoute = TestSessionDeleteRoute;
