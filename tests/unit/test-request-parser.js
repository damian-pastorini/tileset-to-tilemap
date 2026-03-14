let { TestRunner, assert } = require('../lib/test-runner');
let { RequestParser } = require('../../lib/routes/request-parser');

class TestRequestParser
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

    async testParseTilesetParams()
    {
        this.runner.suite('RequestParser');
        this.runner.group('parseTilesetParams');
        await this.runner.test('returns defaults for empty body', () => {
            let parser = new RequestParser();
            let result = parser.parseTilesetParams({});
            assert.strictEqual(result.sessionId, '');
            assert.strictEqual(result.imageId, '');
            assert.strictEqual(result.provider, '');
            assert.strictEqual(result.tileWidth, 32);
            assert.strictEqual(result.tileHeight, 32);
            assert.strictEqual(result.spacing, 0);
            assert.strictEqual(result.margin, 0);
            assert.strictEqual(result.bgColor, null);
            assert.strictEqual(result.resizeValue, 0);
        });
        await this.runner.test('reads sessionId imageId and provider', () => {
            let parser = new RequestParser();
            let result = parser.parseTilesetParams({sessionId: 'sess', imageId: 'img.png', provider: 'claude'});
            assert.strictEqual(result.sessionId, 'sess');
            assert.strictEqual(result.imageId, 'img.png');
            assert.strictEqual(result.provider, 'claude');
        });
        await this.runner.test('converts tileWidth and tileHeight strings to numbers', () => {
            let parser = new RequestParser();
            let result = parser.parseTilesetParams({tileWidth: '16', tileHeight: '48'});
            assert.strictEqual(result.tileWidth, 16);
            assert.strictEqual(result.tileHeight, 48);
        });
        await this.runner.test('converts spacing and margin strings to numbers', () => {
            let parser = new RequestParser();
            let result = parser.parseTilesetParams({spacing: '2', margin: '4'});
            assert.strictEqual(result.spacing, 2);
            assert.strictEqual(result.margin, 4);
        });
        await this.runner.test('reads bgColor', () => {
            let parser = new RequestParser();
            let result = parser.parseTilesetParams({bgColor: '#ffffff'});
            assert.strictEqual(result.bgColor, '#ffffff');
        });
        await this.runner.test('converts resizeValue string to number', () => {
            let parser = new RequestParser();
            let result = parser.parseTilesetParams({resizeValue: '32'});
            assert.strictEqual(result.resizeValue, 32);
        });
    }

    async testValidateAiParams()
    {
        this.runner.group('validateAiParams');
        await this.runner.test('returns false and sends error when sessionId missing', () => {
            let parser = new RequestParser();
            let res = this.buildMockRes();
            let result = parser.validateAiParams({sessionId: '', imageId: 'img.png', provider: 'claude'}, res);
            assert.strictEqual(result, false);
            assert.ok(res.body);
            assert.ok(res.body.error);
        });
        await this.runner.test('returns false when imageId missing', () => {
            let parser = new RequestParser();
            let res = this.buildMockRes();
            let result = parser.validateAiParams({sessionId: 'sess', imageId: '', provider: 'claude'}, res);
            assert.strictEqual(result, false);
        });
        await this.runner.test('returns false when provider missing', () => {
            let parser = new RequestParser();
            let res = this.buildMockRes();
            let result = parser.validateAiParams({sessionId: 'sess', imageId: 'img.png', provider: ''}, res);
            assert.strictEqual(result, false);
        });
        await this.runner.test('returns true when all params present', () => {
            let parser = new RequestParser();
            let res = this.buildMockRes();
            let result = parser.validateAiParams({sessionId: 'sess', imageId: 'img.png', provider: 'claude'}, res);
            assert.strictEqual(result, true);
            assert.strictEqual(res.body, null);
        });
    }
}

module.exports.TestRequestParser = TestRequestParser;
