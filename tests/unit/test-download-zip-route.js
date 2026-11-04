const os = require('node:os');
const crypto = require('node:crypto');
const { Writable } = require('node:stream');
const { unzipSync } = require('fflate');
const { FileHandler } = require('@reldens/server-utils');
const { TestRunner, assert } = require('../test-runner');
const { TestFixtures } = require('../test-fixtures');
const { DownloadZipRoute } = require('../../lib/routes/download-zip');

class TestDownloadZipRoute
{
    constructor()
    {
        this.runner = new TestRunner();
        this.rootDir = FileHandler.joinPaths(os.tmpdir(), 'tileset-zip-test-'+FileHandler.generateSecureFilename(''));
        this.route = new DownloadZipRoute(this.rootDir);
        this.pngBytes = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 255, 0, 128]);
        this.largeBytes = crypto.randomBytes(300000);
    }

    buildStreamResponse(destroyOnFirstChunk)
    {
        let res = new Writable({
            write: (chunk, encoding, callback) => {
                res.writtenChunks.push(chunk);
                callback();
                if(destroyOnFirstChunk){
                    res.destroy();
                }
            }
        });
        res.writtenChunks = [];
        res.headers = {};
        res.statusCode = null;
        res.setHeader = (name, value) => {
            res.headers[name] = value;
        };
        res.status = (code) => {
            res.statusCode = code;
            return res;
        };
        res.json = (body) => {
            res.body = body;
        };
        return res;
    }

    createSessionFiles()
    {
        let sessionDir = FileHandler.joinPaths(this.rootDir, 'output', 'session-001');
        FileHandler.createFolder(FileHandler.joinPaths(sessionDir, 'ai-buffer'));
        FileHandler.writeFile(FileHandler.joinPaths(sessionDir, 'composite.json'), '{"layers":[]}');
        FileHandler.writeFile(FileHandler.joinPaths(sessionDir, 'ai-buffer', 'tileset.png'), this.pngBytes);
        FileHandler.writeFile(FileHandler.joinPaths(sessionDir, 'large.bin'), this.largeBytes);
        FileHandler.createFolder(FileHandler.joinPaths(this.rootDir, 'output', 'empty-session'));
        FileHandler.writeFile(FileHandler.joinPaths(this.rootDir, 'output', 'file-session'), 'not a folder');
        FileHandler.createFolder(FileHandler.joinPaths(this.rootDir, 'input', 'secret-session'));
        FileHandler.writeFile(FileHandler.joinPaths(this.rootDir, 'input', 'secret-session', 'secret.txt'), 'secret');
    }

    assertSessionArchive(res)
    {
        let entries = unzipSync(new Uint8Array(Buffer.concat(res.writtenChunks)));
        assert.deepStrictEqual(Object.keys(entries).sort(), ['ai-buffer/tileset.png', 'composite.json', 'large.bin']);
        assert.strictEqual(Buffer.from(entries['composite.json']).toString('utf8'), '{"layers":[]}');
        assert.deepStrictEqual(Buffer.from(entries['ai-buffer/tileset.png']), this.pngBytes);
        assert.deepStrictEqual(Buffer.from(entries['large.bin']), this.largeBytes);
    }

    async testHandle()
    {
        this.createSessionFiles();
        this.runner.group('handle validation');
        await this.runner.test('rejects empty sessionId with 400', async () => {
            let res = TestFixtures.buildJsonMockRes();
            await this.route.handle({params: {sessionId: ''}}, res);
            assert.strictEqual(res.statusCode, 400);
            assert.strictEqual(res.body.error, 'Invalid session ID');
        });
        await this.runner.test('rejects missing sessionId param with 400', async () => {
            let res = TestFixtures.buildJsonMockRes();
            await this.route.handle({params: {}}, res);
            assert.strictEqual(res.statusCode, 400);
        });
        await this.runner.test('rejects double dot sessionId with 400', async () => {
            let res = TestFixtures.buildJsonMockRes();
            await this.route.handle({params: {sessionId: '..'}}, res);
            assert.strictEqual(res.statusCode, 400);
        });
        await this.runner.test('does not escape the output folder with a traversal sequence', async () => {
            let res = TestFixtures.buildJsonMockRes();
            await this.route.handle({params: {sessionId: ['..', 'input', 'secret-session'].join('/')}}, res);
            assert.strictEqual(res.statusCode, 404);
            assert.strictEqual(res.body.error, 'Session not found');
        });
        await this.runner.test('does not escape the output folder with a backslash traversal', async () => {
            let res = TestFixtures.buildJsonMockRes();
            await this.route.handle({params: {sessionId: '..\\..'}}, res);
            assert.strictEqual(res.statusCode, 400);
        });
        await this.runner.test('returns 404 for a missing session', async () => {
            let res = TestFixtures.buildJsonMockRes();
            await this.route.handle({params: {sessionId: 'missing-session'}}, res);
            assert.strictEqual(res.statusCode, 404);
        });
        await this.runner.test('returns 404 when the session path is a file', async () => {
            let res = TestFixtures.buildJsonMockRes();
            await this.route.handle({params: {sessionId: 'file-session'}}, res);
            assert.strictEqual(res.statusCode, 404);
        });
        this.runner.group('handle streaming');
        await this.runner.test('streams nested binary and text files with relative names', async () => {
            let res = this.buildStreamResponse(false);
            await this.route.handle({params: {sessionId: 'session-001'}}, res);
            assert.strictEqual(res.statusCode, null);
            assert.strictEqual(res.headers['Content-Type'], 'application/zip');
            assert.strictEqual(res.headers['Content-Disposition'], 'attachment; filename="session-001.zip"');
            this.assertSessionArchive(res);
        });
        await this.runner.test('uses the sanitized sessionId in the download filename', async () => {
            let res = this.buildStreamResponse(false);
            await this.route.handle({params: {sessionId: 'session-001"\r\n'}}, res);
            assert.strictEqual(res.headers['Content-Disposition'], 'attachment; filename="session-001.zip"');
            this.assertSessionArchive(res);
        });
        await this.runner.test('streams a valid empty archive for an empty session', async () => {
            let res = this.buildStreamResponse(false);
            await this.route.handle({params: {sessionId: 'empty-session'}}, res);
            assert.deepStrictEqual(Object.keys(unzipSync(new Uint8Array(Buffer.concat(res.writtenChunks)))), []);
        });
        await this.runner.test('serves overlapping downloads of the same session independently', async () => {
            let firstRes = this.buildStreamResponse(false);
            let secondRes = this.buildStreamResponse(false);
            await Promise.all([
                this.route.handle({params: {sessionId: 'session-001'}}, firstRes),
                this.route.handle({params: {sessionId: 'session-001'}}, secondRes)
            ]);
            this.assertSessionArchive(firstRes);
            this.assertSessionArchive(secondRes);
        });
        await this.runner.test('stops streaming without rejecting when the client disconnects', async () => {
            let res = this.buildStreamResponse(true);
            await this.route.handle({params: {sessionId: 'session-001'}}, res);
            assert.strictEqual(res.destroyed, true);
            assert.strictEqual(res.writtenChunks.length, 1);
        });
        FileHandler.remove(this.rootDir);
    }

    async testBuildZipChunks()
    {
        this.runner.suite('DownloadZipRoute');
        this.runner.group('buildZipChunks');
        let filesDir = FileHandler.joinPaths(this.rootDir, 'chunks');
        FileHandler.createFolder(filesDir);
        let keptPath = FileHandler.joinPaths(filesDir, 'kept.json');
        FileHandler.writeFile(keptPath, '{"kept":true}');
        await this.runner.test('skips a file removed after the folder was read', async () => {
            let chunks = [];
            let files = [
                {path: FileHandler.joinPaths(filesDir, 'removed.json'), name: 'removed.json'},
                {path: keptPath, name: 'kept.json'}
            ];
            for await(let chunk of this.route.buildZipChunks(files)){
                chunks.push(chunk);
            }
            let entries = unzipSync(new Uint8Array(Buffer.concat(chunks)));
            assert.deepStrictEqual(Object.keys(entries), ['kept.json']);
            assert.strictEqual(Buffer.from(entries['kept.json']).toString('utf8'), '{"kept":true}');
        });
        await this.runner.test('rejects with the zip error when an entry name is too long', async () => {
            let files = [{path: keptPath, name: 'a'.repeat(65536)}];
            await assert.rejects(async () => {
                for await(let chunk of this.route.buildZipChunks(files)){
                    assert.ok(chunk);
                }
            }, /filename too long/);
        });
        FileHandler.remove(this.rootDir);
    }
}

module.exports.TestDownloadZipRoute = TestDownloadZipRoute;
