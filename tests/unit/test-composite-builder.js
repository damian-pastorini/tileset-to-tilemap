const { TestRunner, assert } = require('../test-runner');
const { CompositeBuilder } = require('../../lib/composite-builder');
const { ElementBuilder } = require('../../lib/element-builder');

class TestCompositeBuilder
{
    constructor()
    {
        this.runner = new TestRunner();
        this.builder = new CompositeBuilder();
    }

    buildTileset(overrides)
    {
        return Object.assign({
            tilesetColumns: 4,
            filename: 'test.png',
            imageHeight: 128,
            imageWidth: 128,
            margin: 0,
            spacing: 0,
            tileCount: 16,
            tileHeight: 32,
            tileWidth: 32,
            tileRows: 4,
            elements: [
                {
                    name: 'tree-001',
                    layers: [
                        {type: 'over-player', tiles: [[0, 0], [0, 1]]},
                        {type: 'collisions', tiles: [[1, 0], [1, 1]]}
                    ]
                }
            ]
        }, overrides);
    }

    buildPackElement(overrides)
    {
        return Object.assign({
            element: {},
            minRow: 0,
            minCol: 0,
            w: 2,
            h: 2,
            firstgid: 1,
            tilesetColumns: 4
        }, overrides);
    }

    async testBuildCompositeJSONRejectsEmpty()
    {
        this.runner.suite('CompositeBuilder');
        this.runner.group('buildCompositeJSON empty input');
        await this.runner.test('returns false for null', () => {
            assert.strictEqual(this.builder.buildCompositeJSON(null), false);
        });
        await this.runner.test('returns false for empty array', () => {
            assert.strictEqual(this.builder.buildCompositeJSON([]), false);
        });
    }

    async testPreprocessTilesets()
    {
        this.runner.group('preprocessTilesets');
        await this.runner.test('returns tilesetEntries with firstgid 1', () => {
            let elementBuilder = new ElementBuilder();
            let result = this.builder.preprocessTilesets([this.buildTileset({})], elementBuilder);
            assert.strictEqual(result.tilesetEntries[0].firstgid, 1);
        });
        await this.runner.test('accumulates totalArea from elements', () => {
            let elementBuilder = new ElementBuilder();
            let result = this.builder.preprocessTilesets([this.buildTileset({})], elementBuilder);
            assert.ok(result.totalArea > 0);
        });
        await this.runner.test('tracks maxElemWidth', () => {
            let elementBuilder = new ElementBuilder();
            let result = this.builder.preprocessTilesets([this.buildTileset({})], elementBuilder);
            assert.ok(result.maxElemWidth > 0);
        });
        await this.runner.test('skips elements with no tiles', () => {
            let elementBuilder = new ElementBuilder();
            let tilesetWithEmpty = this.buildTileset({
                elements: [{name: 'empty-001', layers: [{type: 'collisions', tiles: []}]}]
            });
            let result = this.builder.preprocessTilesets([tilesetWithEmpty], elementBuilder);
            assert.strictEqual(result.elements.length, 0);
        });
    }

    async testPackElements()
    {
        this.runner.group('packElements');
        await this.runner.test('returns canvas dimensions and placements', () => {
            let elements = [this.buildPackElement({})];
            let result = this.builder.packElements(elements, 9, 2);
            assert.ok(result.canvasWidth > 0);
            assert.ok(result.canvasHeight > 0);
            assert.strictEqual(result.placements.length, 1);
        });
        await this.runner.test('empty elements gives minimal canvas', () => {
            let result = this.builder.packElements([], 0, 0);
            assert.strictEqual(result.placements.length, 0);
        });
        await this.runner.test('placement has elemCanvasRow and elemCanvasCol', () => {
            let elements = [this.buildPackElement({w: 1, h: 1})];
            let result = this.builder.packElements(elements, 4, 1);
            assert.strictEqual(result.placements[0].elemCanvasRow, 1);
            assert.strictEqual(result.placements[0].elemCanvasCol, 1);
        });
    }

    async testBuildCompositeJSON()
    {
        this.runner.group('buildCompositeJSON full');
        await this.runner.test('returns valid map structure', () => {
            let result = this.builder.buildCompositeJSON([this.buildTileset({})]);
            assert.ok(result);
            assert.strictEqual(result.type, 'map');
            assert.strictEqual(result.orientation, 'orthogonal');
        });
        await this.runner.test('uses tile size from first tileset', () => {
            let result = this.builder.buildCompositeJSON([this.buildTileset({})]);
            assert.strictEqual(result.tileheight, 32);
            assert.strictEqual(result.tilewidth, 32);
        });
        await this.runner.test('includes tilesets array', () => {
            let result = this.builder.buildCompositeJSON([this.buildTileset({})]);
            assert.ok(Array.isArray(result.tilesets));
            assert.strictEqual(result.tilesets.length, 1);
        });
        await this.runner.test('layers contain element layer data', () => {
            let result = this.builder.buildCompositeJSON([this.buildTileset({})]);
            assert.ok(Array.isArray(result.layers));
            assert.ok(result.layers.length > 0);
        });
    }
}

module.exports.TestCompositeBuilder = TestCompositeBuilder;
