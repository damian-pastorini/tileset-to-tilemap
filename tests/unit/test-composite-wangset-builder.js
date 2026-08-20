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

    async testBuildSpotWangsetsNames()
    {
        this.runner.suite('CompositeWangsetBuilder');
        this.runner.group('buildSpotWangsets');
        await this.runner.test('builds the inner and outer walls wangsets with the normalized spot key', () => {
            let wangsets = this.builder.buildSpotWangsets([this.buildSpot({name: 'spot-001'})]);
            assert.strictEqual(wangsets.length, 2);
            assert.strictEqual(wangsets[0].name, 'spot_001-inner-walls');
            assert.strictEqual(wangsets[1].name, 'spot_001-outer-walls');
        });
    }

    async testWangsetsAreEditableTerrains()
    {
        this.runner.group('terrain data');
        await this.runner.test('every wangset carries one color for the terrain', () => {
            let wangsets = this.builder.buildSpotWangsets([this.buildSpot({})]);
            assert.strictEqual(wangsets[0].colors.length, 1);
            assert.strictEqual(wangsets[0].colors[0].name, 'spot_001-inner-walls');
            assert.strictEqual(wangsets[0].colors[0].tile, 7);
            assert.strictEqual(wangsets[0].colors[0].probability, 1);
        });
        await this.runner.test('the wangsets type covers edges and corners', () => {
            let wangsets = this.builder.buildSpotWangsets([this.buildSpot({})]);
            assert.strictEqual(wangsets[0].type, 'mixed');
        });
        await this.runner.test('the representative tile falls back to -1 without a spot tile', () => {
            let wangsets = this.builder.buildSpotWangsets([this.buildSpot({spotTile: null})]);
            assert.strictEqual(wangsets[0].tile, -1);
            assert.strictEqual(wangsets[0].colors[0].tile, -1);
        });
    }

    async testSpotsWithoutTilesAreSkipped()
    {
        this.runner.group('empty spots');
        await this.runner.test('a spot without tiles does not create wangsets', () => {
            let wangsets = this.builder.buildSpotWangsets([this.buildSpot({
                innerWallsTiles: {},
                innerWallsCornerTiles: {},
                outerWallsTiles: {},
                outerWallsCornerTiles: {}
            })]);
            assert.strictEqual(wangsets.length, 0);
        });
        await this.runner.test('a spot without name is skipped', () => {
            assert.strictEqual(this.builder.buildSpotWangsets([this.buildSpot({name: ''})]).length, 0);
        });
    }
}

module.exports.TestCompositeWangsetBuilder = TestCompositeWangsetBuilder;
