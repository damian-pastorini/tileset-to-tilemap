const { TestRunner, assert } = require('../test-runner');
const { MergeRoute } = require('../../lib/routes/merge');

class TestMergeRoute
{
    constructor()
    {
        this.runner = new TestRunner();
    }

    buildMockRes()
    {
        let mock = {};
        mock.written = [];
        mock.ended = false;
        mock.setHeader = () => {
        };
        mock.flushHeaders = () => {
        };
        mock.flush = () => {
        };
        mock.write = (chunk) => {
            mock.written.push(chunk);
        };
        mock.end = () => {
            mock.ended = true;
        };
        mock.socket = null;
        return mock;
    }

    buildRequest(overrides)
    {
        return {body: Object.assign({
            sessionId: 'sess',
            tilesets: [{}]
        }, overrides)};
    }

    async testSendEvent()
    {
        this.runner.suite('MergeRoute');
        this.runner.group('sendEvent');
        await this.runner.test('writes SSE formatted string', () => {
            let route = new MergeRoute('/root');
            let res = this.buildMockRes();
            route.sendEvent(res, 'progress', {message: 'hello'});
            assert.strictEqual(res.written.length, 1);
            assert.ok(res.written[0].includes('event: progress'));
            assert.ok(res.written[0].includes('hello'));
        });
        await this.runner.test('writes correct event type', () => {
            let route = new MergeRoute('/root');
            let res = this.buildMockRes();
            route.sendEvent(res, 'done', {result: 'ok'});
            assert.ok(res.written[0].includes('event: done'));
        });
    }

    async testHandle()
    {
        this.runner.group('handle');
        await this.runner.test('sends error event when sessionId missing', async () => {
            let route = new MergeRoute('/root');
            let res = this.buildMockRes();
            await route.handle({body: {}}, res);
            assert.ok(res.written.length > 0);
            assert.ok(res.written[0].includes('error'));
            assert.ok(res.ended);
        });
        await this.runner.test('sends error event when only one tileset provided', async () => {
            let route = new MergeRoute('/root');
            let res = this.buildMockRes();
            await route.handle(this.buildRequest({}), res);
            assert.ok(res.written.length > 0);
            assert.ok(res.written[0].includes('error'));
            assert.ok(res.ended);
        });
        await this.runner.test('sends error event when tilesets is not array', async () => {
            let route = new MergeRoute('/root');
            let res = this.buildMockRes();
            await route.handle(this.buildRequest({tilesets: 'bad'}), res);
            assert.ok(res.written.length > 0);
            assert.ok(res.written[0].includes('error'));
        });
        await this.runner.test('sends error event when tilesets array is empty', async () => {
            let route = new MergeRoute('/root');
            let res = this.buildMockRes();
            await route.handle(this.buildRequest({tilesets: []}), res);
            assert.ok(res.written.length > 0);
            assert.ok(res.written[0].includes('error'));
        });
    }
}

module.exports.TestMergeRoute = TestMergeRoute;
