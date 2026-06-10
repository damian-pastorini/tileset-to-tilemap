let { TestRunner, assert } = require('../lib/test-runner');
let { AnnotatedImageBuilder } = require('../../lib/annotated-image-builder');

class TestAnnotatedImageBuilder
{
    constructor()
    {
        this.runner = new TestRunner();
        this.builder = new AnnotatedImageBuilder();
    }

    async testColorForIndex()
    {
        this.runner.suite('AnnotatedImageBuilder');
        this.runner.group('colorForIndex');
        await this.runner.test('returns hsl string', () => {
            let result = this.builder.colorForIndex(0);
            assert.ok(result.startsWith('hsl('));
        });
        await this.runner.test('different indices produce different colors', () => {
            let c0 = this.builder.colorForIndex(0);
            let c1 = this.builder.colorForIndex(1);
            assert.notStrictEqual(c0, c1);
        });
        await this.runner.test('same index always returns same color', () => {
            assert.strictEqual(this.builder.colorForIndex(5), this.builder.colorForIndex(5));
        });
        await this.runner.test('contains percentage values', () => {
            let result = this.builder.colorForIndex(3);
            assert.ok(result.includes('%'));
        });
    }

    async testBuildSvgOverlay()
    {
        this.runner.group('buildSvgOverlay');
        await this.runner.test('returns string starting with svg tag', () => {
            let tileset = {tileWidth: 32, tileHeight: 32, spacing: 0, margin: 0, filteredTiles: [], elements: []};
            let result = this.builder.buildSvgOverlay(tileset, 64, 64);
            assert.ok(result.startsWith('<svg'));
        });
        await this.runner.test('includes image dimensions from passed metadata', () => {
            let tileset = {tileWidth: 32, tileHeight: 32, spacing: 0, margin: 0, filteredTiles: [], elements: []};
            let result = this.builder.buildSvgOverlay(tileset, 128, 96);
            assert.ok(result.includes('width="128"'));
            assert.ok(result.includes('height="96"'));
        });
        await this.runner.test('includes grid lines', () => {
            let tileset = {tileWidth: 32, tileHeight: 32, spacing: 0, margin: 0, filteredTiles: [], elements: []};
            let result = this.builder.buildSvgOverlay(tileset, 64, 64);
            assert.ok(result.includes('<line'));
        });
        await this.runner.test('includes filtered tile rects', () => {
            let tileset = {tileWidth: 32, tileHeight: 32, spacing: 0, margin: 0, filteredTiles: [[0, 0]], elements: []};
            let result = this.builder.buildSvgOverlay(tileset, 64, 64);
            assert.ok(result.includes('#888888'));
        });
        await this.runner.test('includes element overlay rects', () => {
            let tileset = {
                tileWidth: 32,
                tileHeight: 32,
                spacing: 0,
                margin: 0,
                filteredTiles: [],
                elements: [{
                    colorIndex: 0,
                    layers: [{tiles: [[0, 0]]}]
                }]
            };
            let result = this.builder.buildSvgOverlay(tileset, 64, 64);
            assert.ok(result.includes('fill-opacity="0.4"'));
        });
        await this.runner.test('defaults missing spacing and margin to zero', () => {
            let tileset = {tileWidth: 32, tileHeight: 32, filteredTiles: [], elements: []};
            let result = this.builder.buildSvgOverlay(tileset, 64, 64);
            assert.ok(result.startsWith('<svg'));
            assert.ok(!result.includes('NaN'));
        });
        await this.runner.test('closes svg tag', () => {
            let tileset = {tileWidth: 32, tileHeight: 32, spacing: 0, margin: 0, filteredTiles: [], elements: []};
            let result = this.builder.buildSvgOverlay(tileset, 64, 64);
            assert.ok(result.endsWith('</svg>'));
        });
    }
}

module.exports.TestAnnotatedImageBuilder = TestAnnotatedImageBuilder;
