const { TestRunner, assert } = require('../test-runner');
const { TestFixtures } = require('../test-fixtures');
const { CompositeTileAnnotationBuilder } = require('../../lib/composite-tile-annotation-builder');

class TestCompositeTileAnnotationBuilder
{
    constructor()
    {
        this.runner = new TestRunner();
        this.builder = new CompositeTileAnnotationBuilder();
    }

    buildAnimatedTileset(baseTile, frames)
    {
        return TestFixtures.buildElementsTileset({
            tileAnimations: [{name: 'water', baseTile, defaultDuration: null, frames}]
        });
    }

    async testBuildTileAnnotationsWithAnimations()
    {
        this.runner.suite('CompositeTileAnnotationBuilder');
        this.runner.group('buildTileAnnotations with animations');
        await this.runner.test('annotated ground tile keeps both properties and animation', () => {
            let tileset = this.buildAnimatedTileset(2, [{tile: 3, duration: null}]);
            let result = this.builder.buildTileAnnotations({groundTile: 2}, [], tileset);
            assert.deepStrictEqual(result, [{
                id: 2,
                properties: [{name: 'key', type: 'string', value: 'groundTile'}],
                animation: [{duration: 200, tileid: 2}, {duration: 200, tileid: 3}]
            }]);
        });
        await this.runner.test('annotated spot tile keeps both properties and animation', () => {
            let tileset = this.buildAnimatedTileset(6, [{tile: 6, duration: null}, {tile: 2, duration: 500}]);
            let spots = [{name: 'water-spot', spotTile: 6}];
            let result = this.builder.buildTileAnnotations(null, spots, tileset);
            assert.deepStrictEqual(result.length, 1);
            assert.deepStrictEqual(result[0].properties[0], {
                name: 'groundSpots',
                type: 'string',
                value: 'water_spot'
            });
            assert.deepStrictEqual(result[0].properties.length, 6);
            assert.deepStrictEqual(result[0].animation, [
                {duration: 200, tileid: 6},
                {duration: 500, tileid: 2}
            ]);
        });
        await this.runner.test('animation only entry has no empty properties array', () => {
            let tileset = this.buildAnimatedTileset(6, [{tile: 2, duration: null}]);
            let result = this.builder.buildTileAnnotations(null, [], tileset);
            assert.deepStrictEqual(result.length, 1);
            assert.deepStrictEqual(result[0].id, 6);
            assert.ok(!result[0].properties);
            assert.deepStrictEqual(result[0].animation, [
                {duration: 200, tileid: 6},
                {duration: 200, tileid: 2}
            ]);
        });
        await this.runner.test('unused animated base tile does not reach the annotations', () => {
            let tileset = this.buildAnimatedTileset(12, [{tile: 13, duration: null}]);
            let result = this.builder.buildTileAnnotations({groundTile: 2}, [], tileset);
            assert.deepStrictEqual(result.length, 1);
            assert.deepStrictEqual(result[0].id, 2);
            assert.ok(!result[0].animation);
        });
        await this.runner.test('animated base tile used as a spot variation reaches the annotations', () => {
            let tileset = this.buildAnimatedTileset(12, [{tile: 13, duration: null}]);
            let spots = [{name: 'water-spot', spotTile: 6, spotTileVariations: [12]}];
            let result = this.builder.buildTileAnnotations(null, spots, tileset);
            assert.ok(this.hasAnimationForId(result, 12));
        });
        await this.runner.test('animated base tile used as a ground variation reaches the annotations', () => {
            let tileset = this.buildAnimatedTileset(12, [{tile: 13, duration: null}]);
            let result = this.builder.buildTileAnnotations({randomGroundTiles: [12]}, [], tileset);
            assert.ok(this.hasAnimationForId(result, 12));
        });
    }

    hasAnimationForId(entries, tileId)
    {
        for(let entry of entries){
            if(tileId === entry.id && entry.animation){
                return true;
            }
        }
        return false;
    }

    async testBuildTileAnnotationsWithoutAnimations()
    {
        this.runner.group('buildTileAnnotations without animations');
        await this.runner.test('ground and path annotations are unchanged', () => {
            let tileset = TestFixtures.buildElementsTileset({});
            let result = this.builder.buildTileAnnotations({groundTile: 0, pathTile: 1}, [], tileset);
            assert.deepStrictEqual(result, [
                {id: 0, properties: [{name: 'key', type: 'string', value: 'groundTile'}]},
                {id: 1, properties: [{name: 'key', type: 'string', value: 'pathTile'}]}
            ]);
        });
        await this.runner.test('duplicated annotations for the same tile merge into one entry', () => {
            let tileOptions = {groundTile: 2, surroundingTiles: {'0,0': 2}};
            let tileset = TestFixtures.buildElementsTileset({});
            let result = this.builder.buildTileAnnotations(tileOptions, [], tileset);
            assert.deepStrictEqual(result, [{
                id: 2,
                properties: [
                    {name: 'key', type: 'string', value: 'groundTile'},
                    {name: 'key', type: 'string', value: 'middle-center'}
                ]
            }]);
        });
        await this.runner.test('no annotations and no animations produce no entries', () => {
            let tileset = TestFixtures.buildElementsTileset({});
            assert.deepStrictEqual(this.builder.buildTileAnnotations(null, [], tileset), []);
        });
    }

    async testMergeDuplicateTileAnnotations()
    {
        this.runner.group('mergeDuplicateTileAnnotations');
        await this.runner.test('carries the animation into an annotated entry', () => {
            let tiles = [{id: 4, properties: [{name: 'key', type: 'string', value: 'groundTile'}]}];
            let animationEntries = [{id: 4, animation: [{duration: 200, tileid: 4}, {duration: 200, tileid: 5}]}];
            let result = this.builder.mergeDuplicateTileAnnotations(tiles, animationEntries);
            assert.deepStrictEqual(result, [{
                id: 4,
                properties: [{name: 'key', type: 'string', value: 'groundTile'}],
                animation: [{duration: 200, tileid: 4}, {duration: 200, tileid: 5}]
            }]);
        });
        await this.runner.test('appends animation only entries after the annotated ones', () => {
            let tiles = [{id: 1, properties: [{name: 'key', type: 'string', value: 'pathTile'}]}];
            let animationEntries = [{id: 9, animation: [{duration: 300, tileid: 9}]}];
            let result = this.builder.mergeDuplicateTileAnnotations(tiles, animationEntries);
            assert.deepStrictEqual(result.length, 2);
            assert.deepStrictEqual(result[1].id, 9);
            assert.ok(!result[1].properties);
            assert.deepStrictEqual(result[1].animation, [{duration: 300, tileid: 9}]);
        });
        await this.runner.test('leaves the annotations untouched without animation entries', () => {
            let tiles = [{id: 1, properties: [{name: 'key', type: 'string', value: 'pathTile'}]}];
            let result = this.builder.mergeDuplicateTileAnnotations(tiles, null);
            assert.deepStrictEqual(result, [
                {id: 1, properties: [{name: 'key', type: 'string', value: 'pathTile'}]}
            ]);
        });
    }
}

module.exports.TestCompositeTileAnnotationBuilder = TestCompositeTileAnnotationBuilder;
