const { TestRunner, assert } = require('../test-runner');
const { ClusterDetector } = require('../../lib/cluster-detector');

class TestClusterDetector
{
    constructor()
    {
        this.runner = new TestRunner();
        this.detector = new ClusterDetector();
    }

    async testBuildSubCluster()
    {
        this.runner.suite('ClusterDetector');
        this.runner.group('buildSubCluster');
        await this.runner.test('sets tiles and correct bounds', () => {
            let result = this.detector.buildSubCluster([[0, 0], [0, 1], [1, 0]]);
            assert.deepStrictEqual(result.tiles, [[0, 0], [0, 1], [1, 0]]);
            assert.strictEqual(result.minRow, 0);
            assert.strictEqual(result.maxRow, 1);
            assert.strictEqual(result.minCol, 0);
            assert.strictEqual(result.maxCol, 1);
        });
        await this.runner.test('single tile cluster', () => {
            let result = this.detector.buildSubCluster([[3, 5]]);
            assert.strictEqual(result.minRow, 3);
            assert.strictEqual(result.maxRow, 3);
            assert.strictEqual(result.minCol, 5);
            assert.strictEqual(result.maxCol, 5);
        });
    }

    collectTileKeys(parts)
    {
        let allTiles = [];
        for(let part of parts){
            for(let tile of part.tiles){
                allTiles.push(tile[0]+','+tile[1]);
            }
        }
        return allTiles;
    }

    async testSplitCluster()
    {
        this.runner.group('splitCluster');
        await this.runner.test('no gap returns single cluster', () => {
            let cluster = this.detector.buildSubCluster([[0, 0], [1, 0], [2, 0]]);
            let result = this.detector.splitCluster(cluster);
            assert.strictEqual(result.length, 1);
        });
        await this.runner.test('row gap splits into two clusters', () => {
            let cluster = this.detector.buildSubCluster([[0, 0], [2, 0]]);
            let result = this.detector.splitCluster(cluster);
            assert.strictEqual(result.length, 2);
        });
        await this.runner.test('col gap splits into two clusters', () => {
            let cluster = this.detector.buildSubCluster([[0, 0], [0, 2]]);
            let result = this.detector.splitCluster(cluster);
            assert.strictEqual(result.length, 2);
        });
        await this.runner.test('split preserves all original tiles', () => {
            let cluster = this.detector.buildSubCluster([[0, 0], [2, 0]]);
            let result = this.detector.splitCluster(cluster);
            let allTiles = this.collectTileKeys(result);
            assert.ok(allTiles.includes('0,0'));
            assert.ok(allTiles.includes('2,0'));
        });
        await this.runner.test('single tile cluster stays intact', () => {
            let cluster = this.detector.buildSubCluster([[5, 5]]);
            let result = this.detector.splitCluster(cluster);
            assert.strictEqual(result.length, 1);
            assert.deepStrictEqual(result[0].tiles, [[5, 5]]);
        });
    }

    async testBuildClusters()
    {
        this.runner.group('buildClusters');
        await this.runner.test('filters groups below minClusterTiles', () => {
            let result = this.detector.buildClusters([[[0, 0]], [[1, 0], [1, 1], [1, 2]]], 2);
            assert.strictEqual(result.length, 1);
            assert.strictEqual(result[0].tiles.length, 3);
        });
        await this.runner.test('keeps groups meeting minClusterTiles', () => {
            let result = this.detector.buildClusters([[[0, 0], [0, 1]]], 2);
            assert.strictEqual(result.length, 1);
        });
        await this.runner.test('empty input returns empty array', () => {
            let result = this.detector.buildClusters([], 1);
            assert.strictEqual(result.length, 0);
        });
        await this.runner.test('all filtered returns empty array', () => {
            let result = this.detector.buildClusters([[[0, 0]]], 2);
            assert.strictEqual(result.length, 0);
        });
        await this.runner.test('results have bounds from buildSubCluster', () => {
            let result = this.detector.buildClusters([[[1, 2], [1, 3]]], 1);
            assert.strictEqual(result[0].minRow, 1);
            assert.strictEqual(result[0].maxCol, 3);
        });
    }

    async testApplySplitByGap()
    {
        this.runner.group('applySplitByGap');
        await this.runner.test('cluster with gap splits into two', () => {
            let cluster = this.detector.buildSubCluster([[0, 0], [2, 0]]);
            let result = this.detector.applySplitByGap([cluster], 1);
            assert.strictEqual(result.length, 2);
        });
        await this.runner.test('cluster without gap stays as one', () => {
            let cluster = this.detector.buildSubCluster([[0, 0], [1, 0], [2, 0]]);
            let result = this.detector.applySplitByGap([cluster], 1);
            assert.strictEqual(result.length, 1);
        });
        await this.runner.test('split parts below minClusterTiles are filtered', () => {
            let cluster = this.detector.buildSubCluster([[0, 0], [2, 0]]);
            let result = this.detector.applySplitByGap([cluster], 2);
            assert.strictEqual(result.length, 0);
        });
        await this.runner.test('empty input returns empty array', () => {
            let result = this.detector.applySplitByGap([], 1);
            assert.strictEqual(result.length, 0);
        });
    }

    async testLoadDetectConfig()
    {
        this.runner.group('loadDetectConfig');
        await this.runner.test('returns object with all required keys', () => {
            let detectConfig = this.detector.loadDetectConfig();
            assert.ok('alphaThreshold' in detectConfig);
            assert.ok('colorThreshold' in detectConfig);
            assert.ok('minClusterTiles' in detectConfig);
            assert.ok('varianceThreshold' in detectConfig);
            assert.ok('minFillPct' in detectConfig);
            assert.ok('splitByGap' in detectConfig);
            assert.ok('elementBorderThreshold' in detectConfig);
        });
        await this.runner.test('defaults are correct when env is unset', () => {
            let detectConfig = new ClusterDetector().loadDetectConfig();
            assert.strictEqual(detectConfig.alphaThreshold, 10);
            assert.strictEqual(detectConfig.colorThreshold, 30);
            assert.strictEqual(detectConfig.minClusterTiles, 1);
            assert.strictEqual(detectConfig.varianceThreshold, 0);
            assert.strictEqual(detectConfig.minFillPct, 5);
            assert.strictEqual(detectConfig.splitByGap, true);
            assert.strictEqual(detectConfig.elementBorderThreshold, 20);
        });
        await this.runner.test('reads custom env values', () => {
            let detectConfig = new ClusterDetector({minClusterTiles: 3}).loadDetectConfig();
            assert.strictEqual(detectConfig.minClusterTiles, 3);
        });
        await this.runner.test('splitByGap is false when env is 0', () => {
            let detectConfig = new ClusterDetector({splitByGap: '0'}).loadDetectConfig();
            assert.strictEqual(detectConfig.splitByGap, false);
        });
    }
}

module.exports.TestClusterDetector = TestClusterDetector;
