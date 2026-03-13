let { TestRunner, assert } = require('../lib/test-runner');
let { ClusterNamerPrompts } = require('../../lib/cluster-namer-prompts');

class TestClusterNamerPrompts
{
    constructor()
    {
        this.runner = new TestRunner();
        this.prompts = new ClusterNamerPrompts();
    }

    async testLayerCodesBlock()
    {
        this.runner.suite('ClusterNamerPrompts');
        this.runner.group('layerCodesBlock');
        await this.runner.test('returns a string', () => {
            assert.strictEqual(typeof this.prompts.layerCodesBlock(), 'string');
        });
        await this.runner.test('contains O code', () => {
            assert.ok(this.prompts.layerCodesBlock().includes('O ='));
        });
        await this.runner.test('contains C code', () => {
            assert.ok(this.prompts.layerCodesBlock().includes('C ='));
        });
        await this.runner.test('contains B code', () => {
            assert.ok(this.prompts.layerCodesBlock().includes('B ='));
        });
        await this.runner.test('contains X code', () => {
            assert.ok(this.prompts.layerCodesBlock().includes('X ='));
        });
    }

    async testBuildNamePrompt()
    {
        this.runner.group('buildNamePrompt');
        await this.runner.test('returns a string', () => {
            assert.strictEqual(typeof this.prompts.buildNamePrompt(), 'string');
        });
        await this.runner.test('mentions kebab-case', () => {
            assert.ok(this.prompts.buildNamePrompt().includes('kebab-case'));
        });
        await this.runner.test('mentions skip', () => {
            assert.ok(this.prompts.buildNamePrompt().includes('skip'));
        });
    }

    async testBuildElementsDetectionPrompt()
    {
        this.runner.group('buildElementsDetectionPrompt');
        await this.runner.test('includes dimensions in output', () => {
            let result = this.prompts.buildElementsDetectionPrompt(5, 3);
            assert.ok(result.includes('5'));
            assert.ok(result.includes('3'));
        });
        await this.runner.test('contains example output section', () => {
            let result = this.prompts.buildElementsDetectionPrompt(4, 4);
            assert.ok(result.includes('EXAMPLE OUTPUT'));
        });
        await this.runner.test('contains boundary detection rules', () => {
            let result = this.prompts.buildElementsDetectionPrompt(4, 4);
            assert.ok(result.includes('BOUNDARY DETECTION'));
        });
    }

    async testBuildLayersDetectionPrompt()
    {
        this.runner.group('buildLayersDetectionPrompt');
        await this.runner.test('includes tile list', () => {
            let tiles = [[0, 0], [0, 1], [1, 0]];
            let result = this.prompts.buildLayersDetectionPrompt(tiles, 2, 2);
            assert.ok(result.includes('0,0'));
            assert.ok(result.includes('0,1'));
            assert.ok(result.includes('1,0'));
        });
        await this.runner.test('identifies bottom row', () => {
            let tiles = [[0, 0], [1, 0]];
            let result = this.prompts.buildLayersDetectionPrompt(tiles, 2, 1);
            assert.ok(result.includes('row 1'));
        });
        await this.runner.test('returns a string', () => {
            assert.strictEqual(typeof this.prompts.buildLayersDetectionPrompt([[0, 0]], 1, 1), 'string');
        });
    }

    async testBuildLayersVerificationPrompt()
    {
        this.runner.group('buildLayersVerificationPrompt');
        await this.runner.test('returns a string', () => {
            let layers = [{code: 'C', tiles: [[0, 0]]}];
            let tiles = [[0, 0]];
            let result = this.prompts.buildLayersVerificationPrompt(layers, tiles, 1, 1);
            assert.strictEqual(typeof result, 'string');
        });
        await this.runner.test('includes current layer lines', () => {
            let layers = [{code: 'O', tiles: [[0, 1]]}];
            let tiles = [[0, 1]];
            let result = this.prompts.buildLayersVerificationPrompt(layers, tiles, 1, 2);
            assert.ok(result.includes('O:0,1'));
        });
    }
}

module.exports.TestClusterNamerPrompts = TestClusterNamerPrompts;
