let { TestRunner, assert } = require('../lib/test-runner');
let { TilesetsMerge } = require('../../lib/tilesets-merge');

class TestTilesetsMerge
{
    constructor()
    {
        this.runner = new TestRunner();
        this.merge = new TilesetsMerge();
    }

    async testRemapElementTiles()
    {
        this.runner.suite('TilesetsMerge');
        this.runner.group('remapElementTiles');
        await this.runner.test('adds offsets to all tile coords', () => {
            let element = {
                name: 'tree-001',
                type: 'element',
                approved: true,
                quantity: 1,
                freeSpaceAround: 1,
                allowPathsInFreeSpace: false,
                layers: [{type: 'collisions', tiles: [[0, 0], [1, 1]]}]
            };
            let result = this.merge.remapElementTiles(element, 2, 3);
            assert.deepStrictEqual(result.layers[0].tiles[0], [2, 3]);
            assert.deepStrictEqual(result.layers[0].tiles[1], [3, 4]);
        });
        await this.runner.test('preserves name and type', () => {
            let element = {
                name: 'rock-001',
                type: 'element',
                approved: true,
                quantity: 2,
                freeSpaceAround: 0,
                allowPathsInFreeSpace: true,
                layers: [{type: 'collisions', tiles: [[0, 0]]}]
            };
            let result = this.merge.remapElementTiles(element, 0, 0);
            assert.strictEqual(result.name, 'rock-001');
            assert.strictEqual(result.type, 'element');
        });
        await this.runner.test('zero offset leaves tiles unchanged', () => {
            let element = {
                name: 'box-001',
                type: 'element',
                approved: true,
                quantity: 1,
                freeSpaceAround: 0,
                allowPathsInFreeSpace: false,
                layers: [{type: 'collisions', tiles: [[1, 2]]}]
            };
            let result = this.merge.remapElementTiles(element, 0, 0);
            assert.deepStrictEqual(result.layers[0].tiles[0], [1, 2]);
        });
        await this.runner.test('remaps tiles across multiple layers', () => {
            let element = {
                name: 'tree-001',
                type: 'element',
                approved: true,
                quantity: 1,
                freeSpaceAround: 1,
                allowPathsInFreeSpace: false,
                layers: [
                    {type: 'over-player', tiles: [[0, 0]]},
                    {type: 'collisions', tiles: [[1, 0]]}
                ]
            };
            let result = this.merge.remapElementTiles(element, 5, 10);
            assert.deepStrictEqual(result.layers[0].tiles[0], [5, 10]);
            assert.deepStrictEqual(result.layers[1].tiles[0], [6, 10]);
        });
    }

    async testBuildMergedTilesetState()
    {
        this.runner.group('buildMergedTilesetState');
        await this.runner.test('returns object with all required fields', () => {
            let result = this.merge.buildMergedTilesetState(
                'merged-test', '/path/to/merged.png',
                320, 320, 32, 32, 10, 10, 'session-123', []
            );
            assert.strictEqual(result.imageId, 'merged-test.png');
            assert.strictEqual(result.filename, 'merged-test.png');
            assert.strictEqual(result.filePath, '/path/to/merged.png');
            assert.strictEqual(result.imageWidth, 320);
            assert.strictEqual(result.imageHeight, 320);
            assert.strictEqual(result.tileWidth, 32);
            assert.strictEqual(result.tileHeight, 32);
            assert.strictEqual(result.tilesetColumns, 10);
            assert.strictEqual(result.tileRows, 10);
            assert.strictEqual(result.sessionId, 'session-123');
        });
        await this.runner.test('calculates tileCount from columns and rows', () => {
            let result = this.merge.buildMergedTilesetState(
                'merged', '/path', 320, 320, 32, 32, 5, 8, 'session', []
            );
            assert.strictEqual(result.tileCount, 40);
        });
        await this.runner.test('sets spacing and margin to 0', () => {
            let result = this.merge.buildMergedTilesetState(
                'merged', '/path', 100, 100, 32, 32, 3, 3, 'session', []
            );
            assert.strictEqual(result.spacing, 0);
            assert.strictEqual(result.margin, 0);
        });
        await this.runner.test('imageUrl contains sessionId and filename', () => {
            let result = this.merge.buildMergedTilesetState(
                'merged-abc', '/path', 100, 100, 32, 32, 3, 3, 'my-session', []
            );
            assert.ok(result.imageUrl.includes('my-session'));
            assert.ok(result.imageUrl.includes('merged-abc.png'));
        });
    }
}

module.exports.TestTilesetsMerge = TestTilesetsMerge;
