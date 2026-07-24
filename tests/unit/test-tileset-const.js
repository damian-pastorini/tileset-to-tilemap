const { TestRunner, assert } = require('../test-runner');
const { TilesetConst } = require('../../lib/constants');

class TestTilesetConst
{
    constructor()
    {
        this.runner = new TestRunner();
    }

    async testTilesetConst()
    {
        this.runner.suite('TilesetConst');
        this.runner.group('exports');
        await this.runner.test('exports PROVIDER_ORDER array', () => {
            assert.ok(Array.isArray(TilesetConst.PROVIDER_ORDER));
            assert.ok(TilesetConst.PROVIDER_ORDER.includes('claude'));
            assert.ok(TilesetConst.PROVIDER_ORDER.includes('gemini'));
            assert.ok(TilesetConst.PROVIDER_ORDER.includes('ollama'));
        });
        await this.runner.test('exports ELEMENT_TYPE string', () => {
            assert.strictEqual(typeof TilesetConst.ELEMENT_TYPE, 'string');
            assert.strictEqual(TilesetConst.ELEMENT_TYPE, 'element');
        });
        await this.runner.test('exports CLUSTER_TYPE string', () => {
            assert.strictEqual(typeof TilesetConst.CLUSTER_TYPE, 'string');
            assert.strictEqual(TilesetConst.CLUSTER_TYPE, 'cluster');
        });
        await this.runner.test('does not export ROOT_DIR', () => {
            assert.strictEqual(TilesetConst.ROOT_DIR, undefined);
        });
    }
}

module.exports.TestTilesetConst = TestTilesetConst;
