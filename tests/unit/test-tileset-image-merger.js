const { TestRunner, assert } = require('../test-runner');
const { TilesetImageMerger } = require('../../lib/tileset-image-merger');

class TestTilesetImageMerger
{
    constructor()
    {
        this.runner = new TestRunner();
    }

    buildTileset(overrides)
    {
        return Object.assign({
            tilesetColumns: 2,
            tileRows: 2
        }, overrides);
    }

    async testPackTilesets()
    {
        this.runner.suite('TilesetImageMerger');
        this.runner.group('packTilesets');
        await this.runner.test('empty input returns empty placements', () => {
            let result = TilesetImageMerger.packTilesets([]);
            assert.strictEqual(result.placements.length, 0);
            assert.strictEqual(result.mergedColumns, 0);
            assert.strictEqual(result.mergedRows, 0);
        });
        await this.runner.test('single tileset placed at offset 0,0', () => {
            let ts = this.buildTileset({tilesetColumns: 4, tileRows: 4});
            let result = TilesetImageMerger.packTilesets([ts]);
            assert.strictEqual(result.placements.length, 1);
            assert.strictEqual(result.placements[0].colOffset, 0);
            assert.strictEqual(result.placements[0].rowOffset, 0);
        });
        await this.runner.test('single tileset mergedColumns matches tilesetColumns', () => {
            let ts = this.buildTileset({tilesetColumns: 6, tileRows: 3});
            let result = TilesetImageMerger.packTilesets([ts]);
            assert.strictEqual(result.mergedColumns, 6);
            assert.strictEqual(result.mergedRows, 3);
        });
        await this.runner.test('placements reference original tileset objects', () => {
            let ts = this.buildTileset({tilesetColumns: 4, tileRows: 4});
            let result = TilesetImageMerger.packTilesets([ts]);
            assert.strictEqual(result.placements[0].tileset, ts);
        });
        await this.runner.test('mergedColumns covers all placed tilesets', () => {
            let ts1 = this.buildTileset({});
            let ts2 = this.buildTileset({});
            let result = TilesetImageMerger.packTilesets([ts1, ts2]);
            let maxRight = 0;
            for(let placement of result.placements){
                let right = placement.colOffset + placement.tileset.tilesetColumns;
                if(right > maxRight){
                    maxRight = right;
                }
            }
            assert.strictEqual(result.mergedColumns, maxRight);
        });
        await this.runner.test('mergedRows covers all placed tilesets', () => {
            let ts1 = this.buildTileset({});
            let ts2 = this.buildTileset({});
            let result = TilesetImageMerger.packTilesets([ts1, ts2]);
            let maxBottom = 0;
            for(let placement of result.placements){
                let bottom = placement.rowOffset + placement.tileset.tileRows;
                if(bottom > maxBottom){
                    maxBottom = bottom;
                }
            }
            assert.strictEqual(result.mergedRows, maxBottom);
        });
        await this.runner.test('two tilesets produce two placements', () => {
            let ts1 = this.buildTileset({tilesetColumns: 4, tileRows: 4});
            let ts2 = this.buildTileset({tilesetColumns: 4, tileRows: 4});
            let result = TilesetImageMerger.packTilesets([ts1, ts2]);
            assert.strictEqual(result.placements.length, 2);
        });
        await this.runner.test('three tilesets produce three placements', () => {
            let ts = this.buildTileset({});
            let result = TilesetImageMerger.packTilesets([ts, ts, ts]);
            assert.strictEqual(result.placements.length, 3);
        });
    }
}

module.exports.TestTilesetImageMerger = TestTilesetImageMerger;
