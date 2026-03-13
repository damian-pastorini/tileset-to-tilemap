let { TestRunner, assert } = require('../lib/test-runner');
let { ElementBuilder } = require('../../lib/element-builder');

let mockTilesetMeta = {
    tilesetColumns: 10,
    filename: 'test.png',
    imageHeight: 320,
    imageWidth: 320,
    margin: 0,
    spacing: 0,
    tileCount: 100,
    tileHeight: 32,
    tileWidth: 32
};

class TestElementBuilder
{
    constructor()
    {
        this.runner = new TestRunner();
        this.builder = new ElementBuilder();
    }

    async testGetElementBounds()
    {
        this.runner.suite('ElementBuilder');
        this.runner.group('getElementBounds');
        await this.runner.test('returns bounds from single layer', () => {
            let element = {layers: [{type: 'collisions', tiles: [[1, 2], [3, 4]]}]};
            let bounds = this.builder.getElementBounds(element);
            assert.strictEqual(bounds.minRow, 1);
            assert.strictEqual(bounds.maxRow, 3);
            assert.strictEqual(bounds.minCol, 2);
            assert.strictEqual(bounds.maxCol, 4);
        });
        await this.runner.test('merges tiles from multiple layers', () => {
            let element = {
                layers: [
                    {type: 'over-player', tiles: [[0, 0], [0, 1]]},
                    {type: 'collisions', tiles: [[1, 0], [1, 1]]}
                ]
            };
            let bounds = this.builder.getElementBounds(element);
            assert.strictEqual(bounds.minRow, 0);
            assert.strictEqual(bounds.maxRow, 1);
            assert.strictEqual(bounds.minCol, 0);
            assert.strictEqual(bounds.maxCol, 1);
        });
    }

    async testBuildElementJSON()
    {
        this.runner.group('buildElementJSON');
        await this.runner.test('returns null when no tiles', () => {
            let element = {name: 'empty-001', layers: [{type: 'collisions', tiles: []}]};
            let result = this.builder.buildElementJSON(element, mockTilesetMeta);
            assert.strictEqual(result, null);
        });
        await this.runner.test('returns valid map structure', () => {
            let element = {name: 'rock-001', layers: [{type: 'collisions', tiles: [[1, 2]]}]};
            let result = this.builder.buildElementJSON(element, mockTilesetMeta);
            assert.ok(result);
            assert.strictEqual(result.type, 'map');
            assert.strictEqual(result.orientation, 'orthogonal');
        });
        await this.runner.test('width and height match tile bounding box', () => {
            let element = {name: 'tree-001', layers: [{type: 'collisions', tiles: [[1, 2], [2, 2]]}]};
            let result = this.builder.buildElementJSON(element, mockTilesetMeta);
            assert.strictEqual(result.width, 1);
            assert.strictEqual(result.height, 2);
        });
        await this.runner.test('data contains correct tile IDs', () => {
            let element = {name: 'tree-001', layers: [{type: 'collisions', tiles: [[0, 0]]}]};
            let result = this.builder.buildElementJSON(element, mockTilesetMeta);
            assert.strictEqual(result.layers[0].data[0], 1);
        });
        await this.runner.test('tile ID formula: 1 + row * cols + col', () => {
            let element = {name: 'rock-001', layers: [{type: 'collisions', tiles: [[1, 2]]}]};
            let result = this.builder.buildElementJSON(element, mockTilesetMeta);
            let expectedId = 1 + 1 * 10 + 2;
            assert.strictEqual(result.layers[0].data[0], expectedId);
        });
        await this.runner.test('tileset entry uses correct firstgid', () => {
            let element = {name: 'box-001', layers: [{type: 'collisions', tiles: [[0, 0]]}]};
            let result = this.builder.buildElementJSON(element, mockTilesetMeta);
            assert.strictEqual(result.tilesets[0].firstgid, 1);
        });
        await this.runner.test('layers have correct names from layer type', () => {
            let element = {
                name: 'tree-001',
                layers: [{type: 'over-player', tiles: [[0, 0]]}]
            };
            let result = this.builder.buildElementJSON(element, mockTilesetMeta);
            assert.strictEqual(result.layers[0].name, 'over-player');
        });
    }
}

module.exports.TestElementBuilder = TestElementBuilder;
