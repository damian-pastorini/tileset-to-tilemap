const { TestRunner, assert } = require('../test-runner');
const { RequestParser } = require('../../lib/routes/request-parser');
const { TestFixtures } = require('../test-fixtures');

class TestRequestParser
{
    constructor()
    {
        this.runner = new TestRunner();
        this.parser = new RequestParser();
    }

    async testParseTilesetParams()
    {
        this.runner.suite('RequestParser');
        this.runner.group('parseTilesetParams');
        await this.runner.test('returns defaults for empty body', () => {
            let result = this.parser.parseTilesetParams({});
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
            let result = this.parser.parseTilesetParams(TestFixtures.buildAiRequestBody({}));
            assert.strictEqual(result.sessionId, 'sess');
            assert.strictEqual(result.imageId, 'img.png');
            assert.strictEqual(result.provider, 'claude');
        });
        await this.runner.test('converts tileWidth and tileHeight strings to numbers', () => {
            let result = this.parser.parseTilesetParams({tileWidth: '16', tileHeight: '48'});
            assert.strictEqual(result.tileWidth, 16);
            assert.strictEqual(result.tileHeight, 48);
        });
        await this.runner.test('converts spacing and margin strings to numbers', () => {
            let result = this.parser.parseTilesetParams({spacing: '2', margin: '4'});
            assert.strictEqual(result.spacing, 2);
            assert.strictEqual(result.margin, 4);
        });
        await this.runner.test('reads bgColor', () => {
            let result = this.parser.parseTilesetParams({bgColor: '#ffffff'});
            assert.strictEqual(result.bgColor, '#ffffff');
        });
        await this.runner.test('converts resizeValue string to number', () => {
            let result = this.parser.parseTilesetParams({resizeValue: '32'});
            assert.strictEqual(result.resizeValue, 32);
        });
    }

    async testValidateAiParams()
    {
        this.runner.group('validateAiParams');
        await this.runner.test('returns false and sends error when sessionId missing', () => {
            let res = TestFixtures.buildJsonMockRes();
            let result = this.parser.validateAiParams(TestFixtures.buildAiRequestBody({sessionId: ''}), res);
            assert.strictEqual(result, false);
            assert.ok(res.body);
            assert.ok(res.body.error);
        });
        await this.runner.test('returns false when imageId missing', () => {
            let res = TestFixtures.buildJsonMockRes();
            let result = this.parser.validateAiParams(TestFixtures.buildAiRequestBody({imageId: ''}), res);
            assert.strictEqual(result, false);
        });
        await this.runner.test('returns false when provider missing', () => {
            let res = TestFixtures.buildJsonMockRes();
            let result = this.parser.validateAiParams(TestFixtures.buildAiRequestBody({provider: ''}), res);
            assert.strictEqual(result, false);
        });
        await this.runner.test('returns true when all params present', () => {
            let res = TestFixtures.buildJsonMockRes();
            let result = this.parser.validateAiParams(TestFixtures.buildAiRequestBody({}), res);
            assert.strictEqual(result, true);
            assert.strictEqual(res.body, null);
        });
    }
}

module.exports.TestRequestParser = TestRequestParser;
