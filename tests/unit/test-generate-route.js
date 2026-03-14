let { TestRunner, assert } = require('../lib/test-runner');
let { GenerateRoute } = require('../../lib/routes/generate');

class TestGenerateRoute
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
        this.runner.suite('GenerateRoute');
        this.runner.group('handle');
        await this.runner.test('returns 400 when sessionId missing', async () => {
            let route = new GenerateRoute('/root');
            let res = this.buildMockRes();
            await route.handle({body: {}}, res);
            assert.strictEqual(res.statusCode, 400);
            assert.ok(res.body.error);
        });
        await this.runner.test('returns 400 when tilesets is not an array', async () => {
            let route = new GenerateRoute('/root');
            let res = this.buildMockRes();
            await route.handle({body: {sessionId: 'sess', tilesets: 'invalid'}}, res);
            assert.strictEqual(res.statusCode, 400);
            assert.ok(res.body.error);
        });
        await this.runner.test('returns 400 when tilesets is empty array', async () => {
            let route = new GenerateRoute('/root');
            let res = this.buildMockRes();
            await route.handle({body: {sessionId: 'sess', tilesets: []}}, res);
            assert.strictEqual(res.statusCode, 400);
            assert.ok(res.body.error);
        });
        await this.runner.test('stores rootDir in constructor', () => {
            let route = new GenerateRoute('/my/root');
            assert.strictEqual(route.rootDir, '/my/root');
        });
    }
}

module.exports.TestGenerateRoute = TestGenerateRoute;
