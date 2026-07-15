const { TestRunner, assert } = require('../test-runner');
const { MergeTilesetFilter } = require('../../lib/merge-tileset-filter');

let mockTileset = {
    tilesetColumns: 4,
    filename: 'test.png',
    imageHeight: 128,
    imageWidth: 128,
    margin: 0,
    spacing: 0,
    tileCount: 16,
    tileHeight: 32,
    tileWidth: 32,
    tileRows: 4,
    elements: [
        {name: 'tree-001', type: 'element', layers: [{type: 'collisions', tiles: [[0, 0]]}]},
        {name: 'cluster-001', type: 'cluster', layers: [{type: 'collisions', tiles: [[1, 0]]}]}
    ]
};

class TestMergeTilesetFilter
{
    constructor()
    {
        this.runner = new TestRunner();
        this.filter = new MergeTilesetFilter();
    }

    buildSizedTileset(overrides)
    {
        return Object.assign({
            tileWidth: 32,
            tileHeight: 32
        }, overrides);
    }

    buildMergeRequest(overrides)
    {
        return Object.assign({
            tileset: mockTileset,
            includeElements: false,
            includeClusters: false,
            stateIndex: 0,
            autoResize: false
        }, overrides);
    }

    async testFilterTilesetElements()
    {
        this.runner.suite('MergeTilesetFilter');
        this.runner.group('filterTilesetElements');
        await this.runner.test('no filter returns all elements', () => {
            let result = this.filter.filterTilesetElements(mockTileset, false, false);
            assert.strictEqual(result.length, 2);
        });
        await this.runner.test('includeElements returns only non-cluster elements', () => {
            let result = this.filter.filterTilesetElements(mockTileset, true, false);
            assert.strictEqual(result.length, 1);
            assert.strictEqual(result[0].type, 'element');
        });
        await this.runner.test('includeClusters returns only cluster elements', () => {
            let result = this.filter.filterTilesetElements(mockTileset, false, true);
            assert.strictEqual(result.length, 1);
            assert.strictEqual(result[0].type, 'cluster');
        });
        await this.runner.test('both flags returns all elements', () => {
            let result = this.filter.filterTilesetElements(mockTileset, true, true);
            assert.strictEqual(result.length, 2);
        });
    }

    async testResolveRefTileSize()
    {
        this.runner.group('resolveRefTileSize');
        await this.runner.test('bigger strategy returns max', () => {
            let tilesets = [
                this.buildSizedTileset({tileWidth: 16, tileHeight: 16}),
                this.buildSizedTileset({})
            ];
            let result = this.filter.resolveRefTileSize(tilesets, 'bigger');
            assert.strictEqual(result.refTileWidth, 32);
            assert.strictEqual(result.refTileHeight, 32);
        });
        await this.runner.test('smaller strategy returns min', () => {
            let tilesets = [
                this.buildSizedTileset({tileWidth: 16, tileHeight: 16}),
                this.buildSizedTileset({})
            ];
            let result = this.filter.resolveRefTileSize(tilesets, 'smaller');
            assert.strictEqual(result.refTileWidth, 16);
            assert.strictEqual(result.refTileHeight, 16);
        });
        await this.runner.test('same sizes return that size', () => {
            let tilesets = [
                this.buildSizedTileset({}),
                this.buildSizedTileset({})
            ];
            let result = this.filter.resolveRefTileSize(tilesets, 'bigger');
            assert.strictEqual(result.refTileWidth, 32);
        });
    }

    async testFilterMergeTilesets()
    {
        this.runner.group('filterMergeTilesets');
        await this.runner.test('returns filteredTilesets and originalStateIndices', () => {
            let mergeData = [this.buildMergeRequest({})];
            let result = this.filter.filterMergeTilesets(mergeData);
            assert.ok(Array.isArray(result.filteredTilesets));
            assert.ok(Array.isArray(result.originalStateIndices));
        });
        await this.runner.test('excludes tilesets with no matching elements', () => {
            let emptyTileset = Object.assign({}, mockTileset, {elements: []});
            let mergeData = [this.buildMergeRequest({tileset: emptyTileset, includeElements: true})];
            let result = this.filter.filterMergeTilesets(mergeData);
            assert.strictEqual(result.filteredTilesets.length, 0);
        });
        await this.runner.test('preserves stateIndex in results', () => {
            let mergeData = [this.buildMergeRequest({stateIndex: 3})];
            let result = this.filter.filterMergeTilesets(mergeData);
            assert.strictEqual(result.originalStateIndices[0], 3);
        });
    }
}

module.exports.TestMergeTilesetFilter = TestMergeTilesetFilter;
