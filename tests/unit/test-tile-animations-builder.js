const { TestRunner, assert } = require('../test-runner');
const { TestFixtures } = require('../test-fixtures');
const { TileAnimationsBuilder } = require('../../lib/tile-animations-builder');
const { TilesetConst } = require('../../lib/constants');

class TestTileAnimationsBuilder
{
    constructor()
    {
        this.runner = new TestRunner();
        this.builder = new TileAnimationsBuilder();
    }

    buildAnimation(overrides)
    {
        return Object.assign({
            name: 'water',
            baseTile: 2,
            defaultDuration: null,
            frames: [{tile: 2, duration: null}, {tile: 3, duration: null}]
        }, overrides);
    }

    buildAnimatedTileset(animationOverrides, tilesetOverrides)
    {
        return TestFixtures.buildElementsTileset(Object.assign({
            tileAnimations: [this.buildAnimation(animationOverrides)]
        }, tilesetOverrides));
    }

    buildPlacement(tilesetColumns, tilesetDuration, tileAnimations, rowOffset, colOffset)
    {
        return {
            tileset: {
                tilesetColumns,
                animationsDefaultDuration: tilesetDuration,
                tileAnimations
            },
            rowOffset,
            colOffset
        };
    }

    async testBuildAnimationEntries()
    {
        this.runner.suite('TileAnimationsBuilder');
        this.runner.group('build entries');
        await this.runner.test('emits entry for animation with base tile used by an element layer', () => {
            let result = this.builder.build(this.buildAnimatedTileset({}, {}), []);
            assert.deepStrictEqual(result, [
                {id: 2, animation: [{duration: 200, tileid: 2}, {duration: 200, tileid: 3}]}
            ]);
        });
        await this.runner.test('emits entry when the base tile comes from the annotated ids', () => {
            let tileset = this.buildAnimatedTileset({
                baseTile: 9,
                frames: [{tile: 9, duration: null}, {tile: 10, duration: null}]
            }, {});
            let result = this.builder.build(tileset, [9]);
            assert.deepStrictEqual(result, [
                {id: 9, animation: [{duration: 200, tileid: 9}, {duration: 200, tileid: 10}]}
            ]);
        });
        await this.runner.test('prepends the base tile as first frame when missing', () => {
            let tileset = this.buildAnimatedTileset({frames: [{tile: 3, duration: null}]}, {});
            let result = this.builder.build(tileset, []);
            assert.deepStrictEqual(result, [
                {id: 2, animation: [{duration: 200, tileid: 2}, {duration: 200, tileid: 3}]}
            ]);
        });
        await this.runner.test('skips frames with an invalid tile id', () => {
            let tileset = this.buildAnimatedTileset({
                frames: [{tile: 2}, {tile: null}, {tile: '3'}, {tile: 6}]
            }, {});
            let result = this.builder.build(tileset, []);
            assert.deepStrictEqual(result, [
                {id: 2, animation: [{duration: 200, tileid: 2}, {duration: 200, tileid: 6}]}
            ]);
        });
    }

    async testBuildDurationPrecedence()
    {
        this.runner.group('build duration precedence');
        await this.runner.test('frame duration wins over animation and tileset durations', () => {
            let tileset = this.buildAnimatedTileset({
                defaultDuration: 500,
                frames: [{tile: 2, duration: 750}]
            }, {animationsDefaultDuration: 200});
            let result = this.builder.build(tileset, []);
            assert.deepStrictEqual(result[0].animation, [{duration: 750, tileid: 2}]);
        });
        await this.runner.test('animation duration wins over the tileset duration', () => {
            let tileset = this.buildAnimatedTileset({defaultDuration: 500}, {animationsDefaultDuration: 200});
            let result = this.builder.build(tileset, []);
            assert.deepStrictEqual(result[0].animation, [
                {duration: 500, tileid: 2},
                {duration: 500, tileid: 3}
            ]);
        });
        await this.runner.test('tileset duration wins over the default constant', () => {
            let tileset = this.buildAnimatedTileset({}, {animationsDefaultDuration: 350});
            let result = this.builder.build(tileset, []);
            assert.deepStrictEqual(result[0].animation, [
                {duration: 350, tileid: 2},
                {duration: 350, tileid: 3}
            ]);
        });
        await this.runner.test('falls back to the animations default duration constant', () => {
            let tileset = this.buildAnimatedTileset({}, {animationsDefaultDuration: null});
            let result = this.builder.build(tileset, []);
            assert.deepStrictEqual(result[0].animation, [
                {duration: TilesetConst.ANIMATIONS_DEFAULT_DURATION, tileid: 2},
                {duration: 200, tileid: 3}
            ]);
        });
    }

    async testBuildSkipsUnusedAndInvalid()
    {
        this.runner.group('build skips unused and invalid animations');
        await this.runner.test('returns empty array when the tileset has no animations', () => {
            let missing = TestFixtures.buildElementsTileset({});
            let emptyList = TestFixtures.buildElementsTileset({tileAnimations: []});
            let nullList = TestFixtures.buildElementsTileset({tileAnimations: null});
            assert.deepStrictEqual(this.builder.build(missing, []), []);
            assert.deepStrictEqual(this.builder.build(emptyList, []), []);
            assert.deepStrictEqual(this.builder.build(nullList, []), []);
        });
        await this.runner.test('does not emit the animation when the base tile is unused', () => {
            let tileset = this.buildAnimatedTileset({
                baseTile: 12,
                frames: [{tile: 12, duration: null}, {tile: 13, duration: null}]
            }, {});
            assert.deepStrictEqual(this.builder.build(tileset, []), []);
            assert.deepStrictEqual(this.builder.build(tileset, [11]), []);
        });
        await this.runner.test('does not emit the animation with an invalid base tile', () => {
            let stringBase = this.buildAnimatedTileset({baseTile: '2'}, {});
            let negativeBase = this.buildAnimatedTileset({baseTile: -1}, {});
            let missingBase = this.buildAnimatedTileset({baseTile: null}, {});
            assert.deepStrictEqual(this.builder.build(stringBase, [2]), []);
            assert.deepStrictEqual(this.builder.build(negativeBase, [2]), []);
            assert.deepStrictEqual(this.builder.build(missingBase, [2]), []);
        });
        await this.runner.test('does not emit the animation with empty frames', () => {
            let tileset = this.buildAnimatedTileset({frames: []}, {});
            assert.deepStrictEqual(this.builder.build(tileset, []), []);
        });
    }

    async testRemapForMerge()
    {
        this.runner.group('remapForMerge');
        let placements = this.buildMergePlacements();
        await this.runner.test('remaps the first placement animation for the merged columns', () => {
            let result = this.builder.remapForMerge(placements, 8);
            assert.deepStrictEqual(result[0], {
                name: 'water',
                baseTile: 9,
                defaultDuration: null,
                frames: [{tile: 9, duration: 200}, {tile: 10, duration: 400}]
            });
        });
        await this.runner.test('remaps the second placement with row and column offsets', () => {
            let result = this.builder.remapForMerge(placements, 8);
            assert.deepStrictEqual(result[1], {
                name: 'fire',
                baseTile: 29,
                defaultDuration: null,
                frames: [{tile: 29, duration: 150}, {tile: 28, duration: 150}]
            });
        });
        await this.runner.test('bakes every frame duration into an explicit number', () => {
            let result = this.builder.remapForMerge(placements, 8);
            assert.ok(this.everyFrameDurationIsNumber(result));
        });
        await this.runner.test('keeps the flat index when the placement tileset has no columns', () => {
            let noColumns = [this.buildPlacement(0, null, [{
                name: 'lava',
                baseTile: 7,
                defaultDuration: null,
                frames: [{tile: 8, duration: null}]
            }], 3, 3)];
            let result = this.builder.remapForMerge(noColumns, 8);
            assert.deepStrictEqual(result[0], {
                name: 'lava',
                baseTile: 7,
                defaultDuration: null,
                frames: [{tile: 8, duration: 200}]
            });
        });
        await this.runner.test('returns empty array for placements without animations', () => {
            let empty = [this.buildPlacement(4, 200, [], 0, 0)];
            assert.deepStrictEqual(this.builder.remapForMerge(empty, 8), []);
        });
    }

    buildMergePlacements()
    {
        return [
            this.buildPlacement(4, 200, [{
                name: 'water',
                baseTile: 5,
                defaultDuration: null,
                frames: [{tile: 5, duration: null}, {tile: 6, duration: 400}]
            }], 0, 0),
            this.buildPlacement(2, null, [{
                name: 'fire',
                baseTile: 3,
                defaultDuration: 150,
                frames: [{tile: 3, duration: null}, {tile: 2, duration: null}]
            }], 2, 4)
        ];
    }

    everyFrameDurationIsNumber(animations)
    {
        for(let animation of animations){
            if(!this.framesHaveNumberDuration(animation.frames)){
                return false;
            }
        }
        return true;
    }

    framesHaveNumberDuration(frames)
    {
        for(let frame of frames){
            if('number' !== typeof frame.duration){
                return false;
            }
        }
        return true;
    }
}

module.exports.TestTileAnimationsBuilder = TestTileAnimationsBuilder;
