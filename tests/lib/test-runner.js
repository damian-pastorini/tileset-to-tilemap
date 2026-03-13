/**
 *
 * Reldens - TestRunner
 *
 */

let assert = require('node:assert');
let { Logger } = require('@reldens/utils');

class TestRunner
{
    constructor()
    {
        this.testCount = 0;
        this.passedCount = 0;
        this.failedCount = 0;
        this.currentSuite = '';
        this.currentGroup = '';
    }

    suite(name)
    {
        this.currentSuite = name;
        Logger.info('▶ '+name);
    }

    group(name)
    {
        this.currentGroup = name;
        Logger.info('  ◆ '+name);
    }

    async test(name, testFn)
    {
        this.testCount++;
        let startTime = Date.now();
        try {
            await testFn();
            this.passedCount++;
            Logger.info('    ✔ '+name+' ('+(Date.now()-startTime)+'ms)');
        } catch(error) {
            this.failedCount++;
            Logger.error('    ✖ '+name+' ('+(Date.now()-startTime)+'ms) - '+error.message);
        }
    }

    getResults()
    {
        return {total: this.testCount, passed: this.passedCount, failed: this.failedCount};
    }
}

module.exports.TestRunner = TestRunner;
module.exports.assert = assert;
