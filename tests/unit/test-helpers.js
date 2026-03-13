let { TestRunner, assert } = require('../lib/test-runner');
let { Helpers } = require('../../lib/utils/helpers');

class TestHelpers
{
    constructor()
    {
        this.runner = new TestRunner();
    }

    async testPadNum()
    {
        this.runner.suite('Helpers');
        this.runner.group('padNum');
        await this.runner.test('pads 0 to 3 digits', () => {
            assert.strictEqual(Helpers.padNum(0), '000');
        });
        await this.runner.test('pads single digit', () => {
            assert.strictEqual(Helpers.padNum(5), '005');
        });
        await this.runner.test('pads two digits', () => {
            assert.strictEqual(Helpers.padNum(99), '099');
        });
        await this.runner.test('leaves three digits unchanged', () => {
            assert.strictEqual(Helpers.padNum(100), '100');
        });
        await this.runner.test('leaves three digits at max', () => {
            assert.strictEqual(Helpers.padNum(999), '999');
        });
    }

    async testTileKey()
    {
        this.runner.group('tileKey');
        await this.runner.test('formats zero tile', () => {
            assert.strictEqual(Helpers.tileKey([0, 0]), '0,0');
        });
        await this.runner.test('formats arbitrary tile', () => {
            assert.strictEqual(Helpers.tileKey([5, 3]), '5,3');
        });
        await this.runner.test('formats large coords', () => {
            assert.strictEqual(Helpers.tileKey([100, 200]), '100,200');
        });
    }

    async testElementName()
    {
        this.runner.group('elementName');
        await this.runner.test('returns element-001 for 1', () => {
            assert.strictEqual(Helpers.elementName(1), 'element-001');
        });
        await this.runner.test('returns element-010 for 10', () => {
            assert.strictEqual(Helpers.elementName(10), 'element-010');
        });
        await this.runner.test('returns element-100 for 100', () => {
            assert.strictEqual(Helpers.elementName(100), 'element-100');
        });
    }

    async testSanitizeSessionId()
    {
        this.runner.group('sanitizeSessionId');
        await this.runner.test('keeps alphanumeric and dashes', () => {
            assert.strictEqual(Helpers.sanitizeSessionId('2024-01-01'), '2024-01-01');
        });
        await this.runner.test('removes special chars', () => {
            assert.strictEqual(Helpers.sanitizeSessionId('abc@def!'), 'abcdef');
        });
        await this.runner.test('strips leading and trailing dashes', () => {
            assert.strictEqual(Helpers.sanitizeSessionId('-abc-'), 'abc');
        });
        await this.runner.test('collapses multiple dashes', () => {
            assert.strictEqual(Helpers.sanitizeSessionId('a--b'), 'a-b');
        });
        await this.runner.test('handles empty string', () => {
            assert.strictEqual(Helpers.sanitizeSessionId(''), '');
        });
    }

    async testCalcTileColumns()
    {
        this.runner.group('calcTileColumns');
        await this.runner.test('no margin no spacing', () => {
            assert.strictEqual(Helpers.calcTileColumns(320, 0, 0, 32), 10);
        });
        await this.runner.test('with margin no spacing', () => {
            assert.strictEqual(Helpers.calcTileColumns(340, 10, 0, 32), 10);
        });
        await this.runner.test('with spacing no margin', () => {
            assert.strictEqual(Helpers.calcTileColumns(306, 0, 2, 32), 9);
        });
    }

    async testCalcTileRows()
    {
        this.runner.group('calcTileRows');
        await this.runner.test('no margin no spacing', () => {
            assert.strictEqual(Helpers.calcTileRows(320, 0, 0, 32), 10);
        });
        await this.runner.test('with margin', () => {
            assert.strictEqual(Helpers.calcTileRows(340, 10, 0, 32), 10);
        });
        await this.runner.test('with spacing', () => {
            assert.strictEqual(Helpers.calcTileRows(306, 0, 2, 32), 9);
        });
    }
}

module.exports.TestHelpers = TestHelpers;
