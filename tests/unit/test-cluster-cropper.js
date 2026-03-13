let { TestRunner, assert } = require('../lib/test-runner');
let { ClusterCropper } = require('../../lib/cluster-cropper');

class TestClusterCropper
{
    constructor()
    {
        this.runner = new TestRunner();
        this.cropper = new ClusterCropper();
    }

    async testBuildRelativeTileMap()
    {
        this.runner.suite('ClusterCropper');
        this.runner.group('buildRelativeTileMap');
        await this.runner.test('returns a Set', () => {
            let result = this.cropper.buildRelativeTileMap({tiles: [[0, 0]]});
            assert.ok(result instanceof Set);
        });
        await this.runner.test('contains key for each tile', () => {
            let result = this.cropper.buildRelativeTileMap({tiles: [[0, 0], [0, 1], [1, 0]]});
            assert.strictEqual(result.size, 3);
            assert.ok(result.has('0,0'));
            assert.ok(result.has('0,1'));
            assert.ok(result.has('1,0'));
        });
        await this.runner.test('empty tiles gives empty Set', () => {
            let result = this.cropper.buildRelativeTileMap({tiles: []});
            assert.strictEqual(result.size, 0);
        });
        await this.runner.test('deduplicates repeated tiles', () => {
            let result = this.cropper.buildRelativeTileMap({tiles: [[0, 0], [0, 0], [0, 1]]});
            assert.strictEqual(result.size, 2);
        });
        await this.runner.test('key format is row,col', () => {
            let result = this.cropper.buildRelativeTileMap({tiles: [[3, 7]]});
            assert.ok(result.has('3,7'));
        });
        await this.runner.test('does not contain key for absent tile', () => {
            let result = this.cropper.buildRelativeTileMap({tiles: [[0, 0]]});
            assert.ok(!result.has('1,0'));
        });
    }
}

module.exports.TestClusterCropper = TestClusterCropper;
