let { TestRunner, assert } = require('../lib/test-runner');
let { MapFormatter } = require('../../lib/map-formatter');

class TestMapFormatter
{
    constructor()
    {
        this.runner = new TestRunner();
    }

    async testFormatMap()
    {
        this.runner.suite('MapFormatter');
        this.runner.group('formatMap');
        await this.runner.test('returns a string', () => {
            let map = {height: 2, width: 2, layers: [{data: [1, 0, 0, 2], height: 2, width: 2}]};
            let result = MapFormatter.formatMap(map);
            assert.strictEqual(typeof result, 'string');
        });
        await this.runner.test('compacts data arrays onto one line', () => {
            let map = {layers: [{data: [1, 0, 0, 2]}]};
            let result = MapFormatter.formatMap(map);
            assert.ok(result.includes('"data": [\n1,0,0,2\n'));
        });
        await this.runner.test('preserves other keys with indentation', () => {
            let map = {height: 3, width: 3, layers: []};
            let result = MapFormatter.formatMap(map);
            assert.ok(result.includes('"height": 3'));
            assert.ok(result.includes('"width": 3'));
        });
        await this.runner.test('handles multiple data arrays', () => {
            let map = {layers: [{data: [1, 2]}, {data: [3, 4]}]};
            let result = MapFormatter.formatMap(map);
            assert.ok(result.includes('1,2'));
            assert.ok(result.includes('3,4'));
        });
    }

    async testFormatElementsConfig()
    {
        this.runner.group('formatElementsConfig');
        await this.runner.test('returns a string', () => {
            let tilesets = [{name: 'test', tiles: [1, 2, 3]}];
            let result = MapFormatter.formatElementsConfig(tilesets);
            assert.strictEqual(typeof result, 'string');
        });
        await this.runner.test('inlines tiles arrays', () => {
            let tilesets = [{name: 'test', tiles: [[0, 0], [0, 1]]}];
            let result = MapFormatter.formatElementsConfig(tilesets);
            assert.ok(result.includes('[[0,0],[0,1]]'));
        });
        await this.runner.test('inlines filteredTiles arrays', () => {
            let tilesets = [{filteredTiles: [[1, 2], [3, 4]]}];
            let result = MapFormatter.formatElementsConfig(tilesets);
            assert.ok(result.includes('[[1,2],[3,4]]'));
        });
        await this.runner.test('preserves non-tile keys with indentation', () => {
            let tilesets = [{name: 'my-tileset', tiles: []}];
            let result = MapFormatter.formatElementsConfig(tilesets);
            assert.ok(result.includes('"name"'));
            assert.ok(result.includes('my-tileset'));
        });
    }
}

module.exports.TestMapFormatter = TestMapFormatter;
