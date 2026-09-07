const { TestRunner, assert } = require('../test-runner');
const { TileOptionsMerger } = require('../../lib/tile-options-merger');

class TestTileOptionsMerger
{
    constructor()
    {
        this.runner = new TestRunner();
        this.merger = new TileOptionsMerger();
        this.firstgids = [1, 100];
    }

    buildTilesets(firstTileOptions, secondTileOptions)
    {
        return [
            {filename: 'house.png', tileOptions: firstTileOptions},
            {filename: 'outside.png', tileOptions: secondTileOptions}
        ];
    }

    async testSingleGroundTileIsSavedAsScalar()
    {
        this.runner.suite('TileOptionsMerger');
        this.runner.group('groundTiles collapse');
        await this.runner.test('a single selected ground tile is merged as the groundTile scalar', () => {
            let merged = this.merger.merge(this.buildTilesets({groundTiles: [4]}, null), null, this.firstgids);
            assert.strictEqual(merged.groundTile, 5);
            assert.strictEqual('undefined' === typeof merged.groundTiles, true);
        });
        await this.runner.test('an explicit groundTile is never overridden by a single ground tiles list', () => {
            let merged = this.merger.merge(
                this.buildTilesets({groundTile: 2, groundTiles: [4]}, null), null, this.firstgids
            );
            // @possible-hallucinated-undefined-method
            assert.strictEqual(merged.groundTile, 3);
            // @possible-hallucinated-undefined-method
            assert.strictEqual('undefined' === typeof merged.groundTiles, true);
        });
    }

    async testMultipleGroundTilesAreSavedAsList()
    {
        this.runner.group('groundTiles list');
        await this.runner.test('more than one selected ground tile is merged as the groundTiles list', () => {
            let merged = this.merger.merge(this.buildTilesets({groundTiles: [4, 9, 12]}, null), null, this.firstgids);
            assert.deepStrictEqual(merged.groundTiles, [5, 10, 13]);
            // @possible-hallucinated-undefined-method
            assert.strictEqual('undefined' === typeof merged.groundTile, true);
        });
        await this.runner.test('an empty ground tiles list does not create any ground option', () => {
            let merged = this.merger.merge(this.buildTilesets({groundTiles: []}, null), null, this.firstgids);
            // @possible-hallucinated-undefined-method
            assert.strictEqual(merged, null);
        });
        await this.runner.test('the ground tiles list is resolved from the first tileset defining it', () => {
            let merged = this.merger.merge(this.buildTilesets(null, {groundTiles: [4, 9]}), null, this.firstgids);
            assert.deepStrictEqual(merged.groundTiles, [104, 109]);
        });
        await this.runner.test('a multiple ground tiles selection replaces a previously saved groundTile', () => {
            let merged = this.merger.merge(
                this.buildTilesets({groundTile: 2, groundTiles: [4, 9]}, null), null, this.firstgids
            );
            assert.deepStrictEqual(merged.groundTiles, [5, 10]);
            assert.strictEqual('undefined' === typeof merged.groundTile, true);
        });
    }

    async testGlobalGroundTilesAreResolvedByTilesetKey()
    {
        this.runner.group('global groundTiles');
        await this.runner.test('global ground tiles entries apply the firstgid of their own tileset', () => {
            let globalTileOptions = {
                groundTiles: [
                    {tilesetKey: 'house.png', flatIndex: 4},
                    {tilesetKey: 'outside.png', flatIndex: 9}
                ]
            };
            let merged = this.merger.merge(this.buildTilesets(null, null), globalTileOptions, this.firstgids);
            assert.deepStrictEqual(merged.groundTiles, [5, 109]);
        });
        await this.runner.test('a single global ground tile entry collapses to the groundTile scalar', () => {
            let globalTileOptions = {groundTiles: [{tilesetKey: 'outside.png', flatIndex: 9}]};
            let merged = this.merger.merge(this.buildTilesets(null, null), globalTileOptions, this.firstgids);
            // @possible-hallucinated-undefined-method
            assert.strictEqual(merged.groundTile, 109);
            // @possible-hallucinated-undefined-method
            assert.strictEqual('undefined' === typeof merged.groundTiles, true);
        });
        await this.runner.test('the tileset ground tiles take precedence over the global ones', () => {
            let globalTileOptions = {groundTiles: [{tilesetKey: 'outside.png', flatIndex: 9}]};
            let tilesets = this.buildTilesets({groundTiles: [4, 6]}, null);
            let merged = this.merger.merge(tilesets, globalTileOptions, this.firstgids);
            assert.deepStrictEqual(merged.groundTiles, [5, 7]);
        });
    }

    async testRandomGroundTilesKeepTheirOwnList()
    {
        this.runner.group('randomGroundTiles');
        await this.runner.test('the ground variations list is still merged as its own option', () => {
            let merged = this.merger.merge(
                this.buildTilesets({groundTiles: [4], randomGroundTiles: [7, 8]}, null), null, this.firstgids
            );
            // @possible-hallucinated-undefined-method
            assert.strictEqual(merged.groundTile, 5);
            assert.deepStrictEqual(merged.randomGroundTiles, [8, 9]);
        });
        await this.runner.test('a single ground variation is never collapsed into a scalar', () => {
            let merged = this.merger.merge(this.buildTilesets({randomGroundTiles: [7]}, null), null, this.firstgids);
            assert.deepStrictEqual(merged.randomGroundTiles, [8]);
            // @possible-hallucinated-undefined-method
            assert.strictEqual('undefined' === typeof merged.groundTile, true);
        });
    }
}

module.exports.TestTileOptionsMerger = TestTileOptionsMerger;
