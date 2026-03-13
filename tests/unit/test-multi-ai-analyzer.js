let { TestRunner, assert } = require('../lib/test-runner');
let { MultiAiAnalyzer } = require('../../lib/multi-ai-analyzer');

class TestMultiAiAnalyzer
{
    constructor()
    {
        this.runner = new TestRunner();
        this.analyzer = new MultiAiAnalyzer();
    }

    async testExtractBaseName()
    {
        this.runner.suite('MultiAiAnalyzer');
        this.runner.group('extractBaseName');
        await this.runner.test('extracts base from simple name', () => {
            assert.strictEqual(this.analyzer.extractBaseName('tree-001'), 'tree');
        });
        await this.runner.test('extracts base from multi-word name', () => {
            assert.strictEqual(this.analyzer.extractBaseName('ancient-tree-002'), 'ancient-tree');
        });
        await this.runner.test('extracts base from rock', () => {
            assert.strictEqual(this.analyzer.extractBaseName('rock-003'), 'rock');
        });
        await this.runner.test('strips trailing digits even without strict match', () => {
            let result = this.analyzer.extractBaseName('item-999');
            assert.strictEqual(result, 'item');
        });
        await this.runner.test('returns name unchanged if no suffix', () => {
            assert.strictEqual(this.analyzer.extractBaseName('rock'), 'rock');
        });
    }

    async testDeduplicateNames()
    {
        this.runner.group('deduplicateNames');
        await this.runner.test('unique names are unchanged', () => {
            let elements = [
                {name: 'tree-001'},
                {name: 'rock-001'}
            ];
            let result = this.analyzer.deduplicateNames(elements);
            assert.strictEqual(result[0].name, 'tree-001');
            assert.strictEqual(result[1].name, 'rock-001');
        });
        await this.runner.test('duplicate bases get sequential numbers', () => {
            let elements = [
                {name: 'tree-001'},
                {name: 'tree-002'}
            ];
            let result = this.analyzer.deduplicateNames(elements);
            assert.strictEqual(result[0].name, 'tree-001');
            assert.strictEqual(result[1].name, 'tree-002');
        });
        await this.runner.test('three duplicates get 001 002 003', () => {
            let elements = [
                {name: 'rock-001'},
                {name: 'rock-002'},
                {name: 'rock-003'}
            ];
            let result = this.analyzer.deduplicateNames(elements);
            assert.strictEqual(result[0].name, 'rock-001');
            assert.strictEqual(result[1].name, 'rock-002');
            assert.strictEqual(result[2].name, 'rock-003');
        });
        await this.runner.test('returns same array reference', () => {
            let elements = [{name: 'tree-001'}];
            let result = this.analyzer.deduplicateNames(elements);
            assert.strictEqual(result, elements);
        });
        await this.runner.test('mixed unique and duplicate', () => {
            let elements = [
                {name: 'tree-001'},
                {name: 'tree-002'},
                {name: 'rock-001'}
            ];
            let result = this.analyzer.deduplicateNames(elements);
            let treeCount = result.filter(e => e.name.startsWith('tree')).length;
            assert.strictEqual(treeCount, 2);
            assert.strictEqual(result[2].name, 'rock-001');
        });
    }
}

module.exports.TestMultiAiAnalyzer = TestMultiAiAnalyzer;
