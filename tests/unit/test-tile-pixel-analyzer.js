let { TestRunner, assert } = require('../lib/test-runner');
let { TilePixelAnalyzer } = require('../../lib/tile-pixel-analyzer');

class TestTilePixelAnalyzer
{
    constructor()
    {
        this.runner = new TestRunner();
        this.analyzer = new TilePixelAnalyzer();
    }

    async testParseHexColor()
    {
        this.runner.suite('TilePixelAnalyzer');
        this.runner.group('parseHexColor');
        await this.runner.test('parses 6-char red', () => {
            let result = this.analyzer.parseHexColor('#ff0000');
            assert.strictEqual(result.r, 255);
            assert.strictEqual(result.g, 0);
            assert.strictEqual(result.b, 0);
        });
        await this.runner.test('parses 6-char black', () => {
            let result = this.analyzer.parseHexColor('#000000');
            assert.strictEqual(result.r, 0);
            assert.strictEqual(result.g, 0);
            assert.strictEqual(result.b, 0);
        });
        await this.runner.test('parses 6-char white', () => {
            let result = this.analyzer.parseHexColor('#ffffff');
            assert.strictEqual(result.r, 255);
            assert.strictEqual(result.g, 255);
            assert.strictEqual(result.b, 255);
        });
        await this.runner.test('parses 3-char shorthand red', () => {
            let result = this.analyzer.parseHexColor('#f00');
            assert.strictEqual(result.r, 255);
            assert.strictEqual(result.g, 0);
            assert.strictEqual(result.b, 0);
        });
        await this.runner.test('parses 3-char shorthand expands each digit', () => {
            let result = this.analyzer.parseHexColor('#abc');
            assert.strictEqual(result.r, 170);
            assert.strictEqual(result.g, 187);
            assert.strictEqual(result.b, 204);
        });
        await this.runner.test('returns null for invalid length', () => {
            let result = this.analyzer.parseHexColor('#12');
            assert.strictEqual(result, null);
        });
    }

    async testColorDistance()
    {
        this.runner.group('colorDistance');
        await this.runner.test('identical colors have distance 0', () => {
            assert.strictEqual(this.analyzer.colorDistance(0, 0, 0, 0, 0, 0), 0);
        });
        await this.runner.test('pure red from black is 255', () => {
            assert.strictEqual(this.analyzer.colorDistance(255, 0, 0, 0, 0, 0), 255);
        });
        await this.runner.test('pythagorean 3-4-5 triangle', () => {
            assert.strictEqual(this.analyzer.colorDistance(3, 4, 0, 0, 0, 0), 5);
        });
        await this.runner.test('is symmetric', () => {
            let d1 = this.analyzer.colorDistance(100, 50, 200, 0, 0, 0);
            let d2 = this.analyzer.colorDistance(0, 0, 0, 100, 50, 200);
            assert.strictEqual(d1, d2);
        });
    }
}

module.exports.TestTilePixelAnalyzer = TestTilePixelAnalyzer;
