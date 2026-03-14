let { TestRunner, assert } = require('../lib/test-runner');
let { SessionSaveRoute } = require('../../lib/routes/session-save');

class TestSessionSaveRoute
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

    async testMergeTileset()
    {
        this.runner.suite('SessionSaveRoute');
        this.runner.group('mergeTileset');
        await this.runner.test('replaces tileset with matching filename', () => {
            let route = new SessionSaveRoute('/root');
            let existing = {tilesets: [{filename: 'a.png', data: 'old'}]};
            let tileset = {filename: 'a.png', data: 'new'};
            route.mergeTileset(existing, tileset);
            assert.strictEqual(existing.tilesets.length, 1);
            assert.strictEqual(existing.tilesets[0].data, 'new');
        });
        await this.runner.test('appends tileset when filename not found', () => {
            let route = new SessionSaveRoute('/root');
            let existing = {tilesets: [{filename: 'a.png'}]};
            let tileset = {filename: 'b.png'};
            route.mergeTileset(existing, tileset);
            assert.strictEqual(existing.tilesets.length, 2);
            assert.strictEqual(existing.tilesets[1].filename, 'b.png');
        });
        await this.runner.test('preserves other tilesets when replacing one', () => {
            let route = new SessionSaveRoute('/root');
            let existing = {tilesets: [{filename: 'a.png'}, {filename: 'b.png', data: 'keep'}]};
            let tileset = {filename: 'a.png', data: 'new'};
            route.mergeTileset(existing, tileset);
            assert.strictEqual(existing.tilesets.length, 2);
            assert.strictEqual(existing.tilesets[1].data, 'keep');
        });
        await this.runner.test('works with empty tilesets array', () => {
            let route = new SessionSaveRoute('/root');
            let existing = {tilesets: []};
            let tileset = {filename: 'a.png'};
            route.mergeTileset(existing, tileset);
            assert.strictEqual(existing.tilesets.length, 1);
        });
        await this.runner.test('replaces only the matching tileset when multiple exist', () => {
            let route = new SessionSaveRoute('/root');
            let existing = {tilesets: [
                {filename: 'a.png', v: 1},
                {filename: 'b.png', v: 2},
                {filename: 'c.png', v: 3}
            ]};
            let tileset = {filename: 'b.png', v: 99};
            route.mergeTileset(existing, tileset);
            assert.strictEqual(existing.tilesets.length, 3);
            assert.strictEqual(existing.tilesets[0].v, 1);
            assert.strictEqual(existing.tilesets[1].v, 99);
            assert.strictEqual(existing.tilesets[2].v, 3);
        });
    }

    async testHandle()
    {
        this.runner.group('handle');
        await this.runner.test('returns 400 when sessionId missing', () => {
            let route = new SessionSaveRoute('/root');
            let res = this.buildMockRes();
            route.handle({body: {}}, res);
            assert.strictEqual(res.statusCode, 400);
            assert.ok(res.body.error);
        });
        await this.runner.test('returns 400 when sessionId is only special chars', () => {
            let route = new SessionSaveRoute('/root');
            let res = this.buildMockRes();
            route.handle({body: {sessionId: '!!!'}}, res);
            assert.strictEqual(res.statusCode, 400);
        });
    }
}

module.exports.TestSessionSaveRoute = TestSessionSaveRoute;
