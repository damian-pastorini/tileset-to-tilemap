let { TestRunner, assert } = require('../lib/test-runner');
let { ClusterDetector } = require('../../lib/cluster-detector');

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
            let cfg = this.detector.loadDetectConfig();
            assert.ok('alphaThreshold' in cfg);
            assert.ok('colorThreshold' in cfg);
            assert.ok('minClusterTiles' in cfg);
            assert.ok('varianceThreshold' in cfg);
            assert.ok('minFillPct' in cfg);
            assert.ok('splitByGap' in cfg);
            assert.ok('elementBorderThreshold' in cfg);
        });
        await this.runner.test('defaults are correct when env is unset', () => {
            let keys = [
                'CLUSTER_EMPTY_ALPHA_THRESHOLD', 'CLUSTER_COLOR_DISTANCE', 'MIN_CLUSTER_TILES',
                'CLUSTER_VARIANCE_THRESHOLD', 'CLUSTER_MIN_TILE_FILL_PCT',
                'CLUSTER_SPLIT_BY_GAP', 'ELEMENT_BORDER_COLOR_DISTANCE'
            ];
            let saved = {};
            for(let k of keys){ saved[k] = process.env[k]; delete process.env[k]; }
            let cfg = this.detector.loadDetectConfig();
            for(let k of keys){
                if(saved[k] !== undefined){ process.env[k] = saved[k]; }
            }
            assert.strictEqual(cfg.alphaThreshold, 10);
            assert.strictEqual(cfg.colorThreshold, 30);
            assert.strictEqual(cfg.minClusterTiles, 1);
            assert.strictEqual(cfg.varianceThreshold, 0);
            assert.strictEqual(cfg.minFillPct, 5);
            assert.strictEqual(cfg.splitByGap, true);
            assert.strictEqual(cfg.elementBorderThreshold, 20);
        });
        await this.runner.test('reads custom env values', () => {
            let saved = process.env.MIN_CLUSTER_TILES;
            process.env.MIN_CLUSTER_TILES = '3';
            let cfg = this.detector.loadDetectConfig();
            if(saved !== undefined){ process.env.MIN_CLUSTER_TILES = saved; }
            if(saved === undefined){ delete process.env.MIN_CLUSTER_TILES; }
            assert.strictEqual(cfg.minClusterTiles, 3);
        });
        await this.runner.test('splitByGap is false when env is 0', () => {
            let saved = process.env.CLUSTER_SPLIT_BY_GAP;
            process.env.CLUSTER_SPLIT_BY_GAP = '0';
            let cfg = this.detector.loadDetectConfig();
            if(saved !== undefined){ process.env.CLUSTER_SPLIT_BY_GAP = saved; }
            if(saved === undefined){ delete process.env.CLUSTER_SPLIT_BY_GAP; }
            assert.strictEqual(cfg.splitByGap, false);
        });
    }
}

module.exports.TestClusterDetector = TestClusterDetector;
