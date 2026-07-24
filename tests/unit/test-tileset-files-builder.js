const { TestRunner, assert } = require('../test-runner');
const { TilesetFilesBuilder } = require('../../lib/tileset-files-builder');

class TestTilesetFilesBuilder
{
    constructor()
    {
        this.runner = new TestRunner();
        this.builder = new TilesetFilesBuilder();
    }

    buildElement(overrides)
    {
        return Object.assign({
            layers: [{type: 'collisions', tiles: [[1, 2], [3, 4]]}]
        }, overrides);
    }

    async testBuildElementCluster()
    {
        this.runner.suite('TilesetFilesBuilder');
        this.runner.group('buildElementCluster');
        await this.runner.test('returns null for element with no tiles', () => {
            let element = this.buildElement({layers: [{type: 'collisions', tiles: []}]});
            let result = this.builder.buildElementCluster(element);
            assert.strictEqual(result, null);
        });
        await this.runner.test('returns cluster with correct bounds', () => {
            let element = this.buildElement({});
            let result = this.builder.buildElementCluster(element);
            assert.strictEqual(result.minRow, 1);
            assert.strictEqual(result.maxRow, 3);
            assert.strictEqual(result.minCol, 2);
            assert.strictEqual(result.maxCol, 4);
        });
        await this.runner.test('merges tiles from multiple layers without duplicates', () => {
            let element = this.buildElement({
                layers: [
                    {type: 'over-player', tiles: [[0, 0], [0, 1]]},
                    {type: 'collisions', tiles: [[0, 0], [1, 0]]}
                ]
            });
            let result = this.builder.buildElementCluster(element);
            assert.strictEqual(result.tiles.length, 3);
        });
        await this.runner.test('single tile element', () => {
            let element = this.buildElement({layers: [{type: 'collisions', tiles: [[5, 7]]}]});
            let result = this.builder.buildElementCluster(element);
            assert.strictEqual(result.minRow, 5);
            assert.strictEqual(result.maxRow, 5);
            assert.strictEqual(result.minCol, 7);
            assert.strictEqual(result.maxCol, 7);
        });
    }

    async testResolveOutputFilename()
    {
        this.runner.group('resolveOutputFilename');
        await this.runner.test('returns same name when not used', () => {
            let used = new Set();
            assert.strictEqual(this.builder.resolveOutputFilename('test.png', used), 'test.png');
        });
        await this.runner.test('appends -a when name is taken', () => {
            let used = new Set(['test.png']);
            assert.strictEqual(this.builder.resolveOutputFilename('test.png', used), 'test-a.png');
        });
        await this.runner.test('increments to -b when -a is also taken', () => {
            let used = new Set(['test.png', 'test-a.png']);
            assert.strictEqual(this.builder.resolveOutputFilename('test.png', used), 'test-b.png');
        });
        await this.runner.test('handles different extensions', () => {
            let used = new Set(['map.json']);
            assert.strictEqual(this.builder.resolveOutputFilename('map.json', used), 'map-a.json');
        });
    }

    async testBuildOutputEntry()
    {
        this.runner.group('buildOutputEntry');
        await this.runner.test('returns object with name, downloadUrl, type', () => {
            let result = this.builder.buildOutputEntry('session-123', 'file.json');
            assert.strictEqual(result.name, 'file.json');
            assert.strictEqual(result.type, 'output');
        });
        await this.runner.test('downloadUrl contains sessionId', () => {
            let result = this.builder.buildOutputEntry('session-123', 'file.json');
            assert.ok(result.downloadUrl.includes('session-123'));
        });
        await this.runner.test('downloadUrl contains filename', () => {
            let result = this.builder.buildOutputEntry('session-123', 'composite.json');
            assert.ok(result.downloadUrl.includes('composite.json'));
        });
        await this.runner.test('downloadUrl starts with output/', () => {
            let result = this.builder.buildOutputEntry('session-123', 'file.json');
            assert.ok(result.downloadUrl.startsWith('output/'));
        });
    }
}

module.exports.TestTilesetFilesBuilder = TestTilesetFilesBuilder;
