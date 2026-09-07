const { TestRunner, assert } = require('../test-runner');
const { CompositeWangsetBuilder } = require('../../lib/composite-wangset-builder');

class TestCompositeWangsetBuilder
{
    constructor()
    {
        this.runner = new TestRunner();
        this.builder = new CompositeWangsetBuilder();
    }

    buildSpot(overrides)
    {
        return Object.assign({
            name: 'spot-001',
            spotTile: 7,
            innerWallsTiles: {'0,0': 7, '-1,0': 8},
            innerWallsCornerTiles: {'top-left': 9},
            outerWallsTiles: {'0,0': 10},
            outerWallsCornerTiles: {}
        }, overrides);
    }

    buildSpotWithoutWalls(overrides)
    {
        return this.buildSpot(Object.assign({
            innerWallsTiles: {},
            innerWallsCornerTiles: {},
            outerWallsTiles: {},
            outerWallsCornerTiles: {}
        }, overrides));
    }

    async testBuildSpotWangsetsNames()
    {
        this.runner.suite('CompositeWangsetBuilder');
        this.runner.group('buildSpotWangsets');
        await this.runner.test('builds the ground, inner and outer walls wangsets with the normalized spot key', () => {
            let wangsets = this.builder.buildSpotWangsets([this.buildSpot({name: 'spot-001'})]);
            assert.strictEqual(wangsets.length, 3);
            assert.strictEqual(wangsets[0].name, 'spot_001');
            assert.strictEqual(wangsets[1].name, 'spot_001-inner-walls');
            assert.strictEqual(wangsets[2].name, 'spot_001-outer-walls');
        });
        await this.runner.test('the ground wangset carries the spot tile as its middle center', () => {
            let wangsets = this.builder.buildSpotWangsets([this.buildSpot({name: 'spot-001'})]);
            assert.deepStrictEqual(wangsets[0].wangtiles, [{tileid: 7, wangid: [0, 1, 0, 1, 0, 1, 0, 1]}]);
        });
    }

    async testWangsetsAreEditableTerrains()
    {
        this.runner.group('terrain data');
        await this.runner.test('every wangset carries one color for the terrain', () => {
            let wangsets = this.builder.buildSpotWangsets([this.buildSpot({})]);
            assert.strictEqual(wangsets[1].colors.length, 1);
            assert.strictEqual(wangsets[1].colors[0].name, 'spot_001-inner-walls');
            assert.strictEqual(wangsets[1].colors[0].tile, 7);
            assert.strictEqual(wangsets[1].colors[0].probability, 1);
        });
        await this.runner.test('the wangsets type covers edges and corners', () => {
            let wangsets = this.builder.buildSpotWangsets([this.buildSpot({})]);
            assert.strictEqual(wangsets[1].type, 'mixed');
        });
        await this.runner.test('the representative tile falls back to -1 without a spot tile', () => {
            let wangsets = this.builder.buildSpotWangsets([this.buildSpot({spotTile: null})]);
            assert.strictEqual(wangsets[0].tile, -1);
            assert.strictEqual(wangsets[0].colors[0].tile, -1);
        });
    }

    buildBorderWallsTileOptions()
    {
        return {mapBorderWallsTiles: {
            '-1,-1': 66, '-1,0': 67, '-1,1': 68,
            '0,-1': 114, '0,0': 115, '0,1': 116,
            '1,-1': 162, '1,0': 163, '1,1': 164
        }};
    }

    async testMapBorderWallsWangsetFeedsTheWallSlots()
    {
        this.runner.group('buildMapBorderWallsWangset');
        await this.runner.test('the wall block picked in reading order feeds the generator wall slots', () => {
            let wangset = this.builder.buildMapBorderWallsWangset(this.buildBorderWallsTileOptions());
            assert.deepStrictEqual(wangset.wangtiles, [
                {tileid: 66, wangid: [0, 0, 0, 0, 0, 1, 0, 1]},
                {tileid: 67, wangid: [0, 1, 0, 1, 0, 1, 0, 1]},
                {tileid: 68, wangid: [0, 1, 0, 1, 0, 0, 0, 0]},
                {tileid: 115, wangid: [0, 0, 0, 1, 0, 1, 0, 0]},
                {tileid: 162, wangid: [0, 0, 0, 0, 0, 0, 0, 1]},
                {tileid: 163, wangid: [0, 1, 0, 0, 0, 0, 0, 1]},
                {tileid: 164, wangid: [0, 1, 0, 0, 0, 0, 0, 0]},
                {tileid: 114, wangid: [0, 0, 0, 1, 0, 1, 0, 1]},
                {tileid: 116, wangid: [0, 1, 0, 1, 0, 1, 0, 0]}
            ]);
        });
        await this.runner.test('the wangset is named after the map border walls terrain', () => {
            let wangset = this.builder.buildMapBorderWallsWangset(this.buildBorderWallsTileOptions());
            assert.strictEqual(wangset.name, 'map-border-inner-walls');
            assert.strictEqual(wangset.tile, 67);
        });
        await this.runner.test('the third row feeds the bottom slots for three tiles height walls', () => {
            let wangset = this.builder.buildMapBorderWallsWangset(this.buildBorderWallsTileOptions());
            let wangidsByTileId = {};
            for(let wangtile of wangset.wangtiles){
                wangidsByTileId[wangtile.tileid] = wangtile.wangid;
            }
            assert.deepStrictEqual(wangidsByTileId[162], [0, 0, 0, 0, 0, 0, 0, 1]);
            assert.deepStrictEqual(wangidsByTileId[163], [0, 1, 0, 0, 0, 0, 0, 1]);
            assert.deepStrictEqual(wangidsByTileId[164], [0, 1, 0, 0, 0, 0, 0, 0]);
        });
        await this.runner.test('no border walls selection creates no wangset', () => {
            assert.strictEqual(this.builder.buildMapBorderWallsWangset({}), null);
        });
    }

    async testSpotsWithoutTilesAreSkipped()
    {
        this.runner.group('empty spots');
        await this.runner.test('a spot without wall tiles keeps only its ground wangset', () => {
            let wangsets = this.builder.buildSpotWangsets([this.buildSpotWithoutWalls({})]);
            assert.strictEqual(wangsets.length, 1);
            assert.strictEqual(wangsets[0].name, 'spot_001');
        });
        await this.runner.test('a spot without any tile at all creates no wangsets', () => {
            let wangsets = this.builder.buildSpotWangsets([this.buildSpotWithoutWalls({spotTile: null})]);
            assert.strictEqual(wangsets.length, 0);
        });
        await this.runner.test('a spot without name is skipped', () => {
            assert.strictEqual(this.builder.buildSpotWangsets([this.buildSpot({name: ''})]).length, 0);
        });
    }
}

module.exports.TestCompositeWangsetBuilder = TestCompositeWangsetBuilder;
