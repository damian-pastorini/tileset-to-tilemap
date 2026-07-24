const { TestRunner, assert } = require('../test-runner');
const { TileBoundsCalculator } = require('../../lib/tile-bounds-calculator');

class TestTileBoundsCalculator
{
    constructor()
    {
        this.runner = new TestRunner();
    }

    async testFromTiles()
    {
        this.runner.suite('TileBoundsCalculator');
        this.runner.group('fromTiles');
        await this.runner.test('single tile', () => {
            let result = TileBoundsCalculator.fromTiles([[0, 0]]);
            assert.strictEqual(result.minRow, 0);
            assert.strictEqual(result.maxRow, 0);
            assert.strictEqual(result.minCol, 0);
            assert.strictEqual(result.maxCol, 0);
        });
        await this.runner.test('multiple tiles', () => {
            let result = TileBoundsCalculator.fromTiles([[1, 2], [3, 4], [0, 5]]);
            assert.strictEqual(result.minRow, 0);
            assert.strictEqual(result.maxRow, 3);
            assert.strictEqual(result.minCol, 2);
            assert.strictEqual(result.maxCol, 5);
        });
        await this.runner.test('asymmetric grid', () => {
            let result = TileBoundsCalculator.fromTiles([[2, 3], [1, 4], [3, 1]]);
            assert.strictEqual(result.minRow, 1);
            assert.strictEqual(result.maxRow, 3);
            assert.strictEqual(result.minCol, 1);
            assert.strictEqual(result.maxCol, 4);
        });
        await this.runner.test('single row multiple cols', () => {
            let result = TileBoundsCalculator.fromTiles([[0, 0], [0, 1], [0, 2]]);
            assert.strictEqual(result.minRow, 0);
            assert.strictEqual(result.maxRow, 0);
            assert.strictEqual(result.minCol, 0);
            assert.strictEqual(result.maxCol, 2);
        });
    }
}

module.exports.TestTileBoundsCalculator = TestTileBoundsCalculator;
