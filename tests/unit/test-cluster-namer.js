let { TestRunner, assert } = require('../lib/test-runner');
let { ClusterNamer } = require('../../lib/cluster-namer');

class TestClusterNamer
{
    constructor()
    {
        this.runner = new TestRunner();
        this.namer = new ClusterNamer();
    }

    async testIsValidElementName()
    {
        this.runner.suite('ClusterNamer');
        this.runner.group('isValidElementName');
        await this.runner.test('valid simple name', () => {
            assert.strictEqual(this.namer.isValidElementName('tree-001'), true);
        });
        await this.runner.test('valid multi-word name', () => {
            assert.strictEqual(this.namer.isValidElementName('ancient-tree-002'), true);
        });
        await this.runner.test('valid rock', () => {
            assert.strictEqual(this.namer.isValidElementName('rock-003'), true);
        });
        await this.runner.test('rejects no number suffix', () => {
            assert.strictEqual(this.namer.isValidElementName('tree'), false);
        });
        await this.runner.test('rejects uppercase', () => {
            assert.strictEqual(this.namer.isValidElementName('Tree-001'), false);
        });
        await this.runner.test('rejects two-digit suffix', () => {
            assert.strictEqual(this.namer.isValidElementName('tree-01'), false);
        });
        await this.runner.test('rejects empty string', () => {
            assert.strictEqual(this.namer.isValidElementName(''), false);
        });
        await this.runner.test('rejects number-only', () => {
            assert.strictEqual(this.namer.isValidElementName('001'), false);
        });
    }

    async testParseTilePair()
    {
        this.runner.group('parseTilePair');
        await this.runner.test('parses row,col pair', () => {
            let result = this.namer.parseTilePair('3,5');
            assert.deepStrictEqual(result, [3, 5]);
        });
        await this.runner.test('parses 0,0', () => {
            let result = this.namer.parseTilePair('0,0');
            assert.deepStrictEqual(result, [0, 0]);
        });
        await this.runner.test('parses row=N,col=M syntax', () => {
            let result = this.namer.parseTilePair('row=3,col=5');
            assert.deepStrictEqual(result, [3, 5]);
        });
        await this.runner.test('returns null for empty', () => {
            assert.strictEqual(this.namer.parseTilePair(''), null);
        });
        await this.runner.test('returns null for single value', () => {
            assert.strictEqual(this.namer.parseTilePair('3'), null);
        });
        await this.runner.test('returns null for three values', () => {
            assert.strictEqual(this.namer.parseTilePair('1,2,3'), null);
        });
        await this.runner.test('returns null for non-numeric', () => {
            assert.strictEqual(this.namer.parseTilePair('a,b'), null);
        });
    }

    async testParseLayerTiles()
    {
        this.runner.group('parseLayerTiles');
        await this.runner.test('parses multiple tile pairs', () => {
            let result = this.namer.parseLayerTiles('0,0 0,1 1,0');
            assert.deepStrictEqual(result, [[0, 0], [0, 1], [1, 0]]);
        });
        await this.runner.test('returns empty array for empty string', () => {
            let result = this.namer.parseLayerTiles('');
            assert.deepStrictEqual(result, []);
        });
        await this.runner.test('parses single pair', () => {
            let result = this.namer.parseLayerTiles('2,3');
            assert.deepStrictEqual(result, [[2, 3]]);
        });
        await this.runner.test('skips invalid pairs', () => {
            let result = this.namer.parseLayerTiles('0,0 invalid 1,1');
            assert.deepStrictEqual(result, [[0, 0], [1, 1]]);
        });
    }

    async testParseLayerLines()
    {
        this.runner.group('parseLayerLines');
        await this.runner.test('parses O code to over-player', () => {
            let result = this.namer.parseLayerLines(['O:0,0 0,1']);
            assert.strictEqual(result[0].type, 'over-player');
            assert.deepStrictEqual(result[0].tiles, [[0, 0], [0, 1]]);
        });
        await this.runner.test('parses C code to collisions', () => {
            let result = this.namer.parseLayerLines(['C:1,0 1,1']);
            assert.strictEqual(result[0].type, 'collisions');
        });
        await this.runner.test('parses X code to collisions-over-player', () => {
            let result = this.namer.parseLayerLines(['X:2,0']);
            assert.strictEqual(result[0].type, 'collisions-over-player');
        });
        await this.runner.test('parses B code to below-player', () => {
            let result = this.namer.parseLayerLines(['B:3,0']);
            assert.strictEqual(result[0].type, 'below-player');
        });
        await this.runner.test('parses L code as collisions alias', () => {
            let result = this.namer.parseLayerLines(['L:0,0']);
            assert.strictEqual(result[0].type, 'collisions');
        });
        await this.runner.test('skips invalid lines', () => {
            let result = this.namer.parseLayerLines(['invalid line']);
            assert.deepStrictEqual(result, []);
        });
        await this.runner.test('parses multiple layers', () => {
            let result = this.namer.parseLayerLines(['O:0,0', 'C:1,0', 'X:2,0']);
            assert.strictEqual(result.length, 3);
        });
    }

    async testBuildCleanLayerTiles()
    {
        this.runner.group('buildCleanLayerTiles');
        await this.runner.test('filters tiles not in validKeys', () => {
            let assigned = new Set();
            let valid = new Set(['0,0', '0,1']);
            let result = this.namer.buildCleanLayerTiles([[0, 0], [5, 5]], assigned, valid);
            assert.deepStrictEqual(result, [[0, 0]]);
        });
        await this.runner.test('filters already assigned tiles', () => {
            let assigned = new Set(['0,0']);
            let valid = new Set(['0,0', '0,1']);
            let result = this.namer.buildCleanLayerTiles([[0, 0], [0, 1]], assigned, valid);
            assert.deepStrictEqual(result, [[0, 1]]);
        });
        await this.runner.test('adds accepted tiles to assignedKeys', () => {
            let assigned = new Set();
            let result = this.namer.buildCleanLayerTiles([[1, 2]], assigned, null);
            assert.ok(assigned.has('1,2'));
        });
        await this.runner.test('no validKeys means all non-assigned pass', () => {
            let assigned = new Set();
            let result = this.namer.buildCleanLayerTiles([[0, 0], [9, 9]], assigned, null);
            assert.strictEqual(result.length, 2);
        });
    }

    async testDeduplicateLayers()
    {
        this.runner.group('deduplicateLayers');
        await this.runner.test('keeps valid assigned tiles', () => {
            let parsed = [{type: 'over-player', tiles: [[0, 0], [0, 1]]}];
            let fallback = [[0, 0], [0, 1]];
            let result = this.namer.deduplicateLayers(parsed, fallback);
            assert.strictEqual(result[0].type, 'over-player');
            assert.deepStrictEqual(result[0].tiles, [[0, 0], [0, 1]]);
        });
        await this.runner.test('filters out hallucinated tiles not in fallback', () => {
            let parsed = [{type: 'over-player', tiles: [[0, 0], [5, 5]]}];
            let fallback = [[0, 0], [1, 0]];
            let result = this.namer.deduplicateLayers(parsed, fallback);
            assert.deepStrictEqual(result[0].tiles, [[0, 0]]);
        });
        await this.runner.test('puts unassigned fallback tiles into collisions', () => {
            let parsed = [{type: 'over-player', tiles: [[0, 0]]}];
            let fallback = [[0, 0], [1, 0]];
            let result = this.namer.deduplicateLayers(parsed, fallback);
            let collisionLayer = result.find(l => 'collisions' === l.type);
            assert.ok(collisionLayer);
            assert.deepStrictEqual(collisionLayer.tiles, [[1, 0]]);
        });
        await this.runner.test('no duplicate tiles across layers', () => {
            let parsed = [
                {type: 'over-player', tiles: [[0, 0], [0, 1]]},
                {type: 'collisions', tiles: [[0, 1], [1, 0]]}
            ];
            let fallback = [[0, 0], [0, 1], [1, 0]];
            let result = this.namer.deduplicateLayers(parsed, fallback);
            let allTiles = [];
            for(let layer of result){
                for(let tile of layer.tiles){
                    allTiles.push(tile[0]+','+tile[1]);
                }
            }
            let unique = new Set(allTiles);
            assert.strictEqual(allTiles.length, unique.size);
        });
    }

    async testParseNameOnly()
    {
        this.runner.group('parseNameOnly');
        await this.runner.test('extracts valid element name', () => {
            assert.strictEqual(this.namer.parseNameOnly('tree-001\n'), 'tree-001');
        });
        await this.runner.test('returns null for skip', () => {
            assert.strictEqual(this.namer.parseNameOnly('skip'), null);
        });
        await this.runner.test('returns null for SKIP uppercase', () => {
            assert.strictEqual(this.namer.parseNameOnly('SKIP'), null);
        });
        await this.runner.test('returns null for non-name text', () => {
            assert.strictEqual(this.namer.parseNameOnly('not a valid name'), null);
        });
        await this.runner.test('finds name among extra text', () => {
            let raw = 'Here is the element:\ntree-001\nsome extra';
            assert.strictEqual(this.namer.parseNameOnly(raw), 'tree-001');
        });
    }

    async testParseLayerAssign()
    {
        this.runner.group('parseLayerAssign');
        await this.runner.test('parses valid layer text into layers', () => {
            let result = this.namer.parseLayerAssign('C:0,0 0,1\nO:1,0', [[0, 0], [0, 1], [1, 0]]);
            assert.ok(result);
            assert.ok(Array.isArray(result));
        });
        await this.runner.test('returns null when no layers parsed', () => {
            let result = this.namer.parseLayerAssign('no layers here', null);
            assert.strictEqual(result, null);
        });
    }
}

module.exports.TestClusterNamer = TestClusterNamer;
