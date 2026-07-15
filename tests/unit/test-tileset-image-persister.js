const { TestRunner, assert } = require('../test-runner');
const { TilesetImagePersister } = require('../../lib/tileset-image-persister');

class TestTilesetImagePersister
{
    constructor()
    {
        this.runner = new TestRunner();
    }

    buildTileset(overrides)
    {
        return Object.assign({
            filePath: '',
            imageUrl: '',
            imageId: 'tile.png',
            sessionId: ''
        }, overrides);
    }

    buildCroppedPaths(overrides)
    {
        return Object.assign({
            'a.png': {'x-001': '/output/old/x.png'}
        }, overrides);
    }

    async testUpdateTilesetPaths()
    {
        this.runner.suite('TilesetImagePersister');
        this.runner.group('updateTilesetPaths');
        await this.runner.test('replaces oldInputDir in filePath', () => {
            let tileset = this.buildTileset({filePath: 'generated/input/old-session/tileset.png'});
            TilesetImagePersister.updateTilesetPaths(
                tileset,
                'generated/input/old-session',
                'generated/input/new-session',
                '',
                '',
                null,
                'new-session'
            );
            assert.ok(tileset.filePath.includes('new-session'));
            assert.ok(!tileset.filePath.includes('old-session'));
        });
        await this.runner.test('replaces oldOutputDir in filePath', () => {
            let tileset = this.buildTileset({filePath: 'generated/output/old-session/merged.png'});
            TilesetImagePersister.updateTilesetPaths(
                tileset,
                '',
                '',
                'generated/output/old-session',
                'generated/output/new-session',
                null,
                'new-session'
            );
            assert.ok(tileset.filePath.includes('new-session'));
        });
        await this.runner.test('replaces oldSessionId in imageUrl', () => {
            let tileset = this.buildTileset({imageUrl: '/tileset-image/old-session/file.png'});
            TilesetImagePersister.updateTilesetPaths(tileset, '', '', '', '', 'old-session', 'new-session');
            assert.ok(tileset.imageUrl.includes('new-session'));
            assert.ok(!tileset.imageUrl.includes('old-session'));
        });
        await this.runner.test('leaves paths unchanged when no old dirs', () => {
            let tileset = this.buildTileset({
                filePath: 'some/path/file.png',
                imageUrl: '/tileset-image/session/file.png'
            });
            TilesetImagePersister.updateTilesetPaths(tileset, '', '', '', '', null, 'session');
            assert.strictEqual(tileset.filePath, 'some/path/file.png');
        });
    }

    async testPersistImages()
    {
        this.runner.group('persistImages');
        await this.runner.test('sets sessionId on each tileset', () => {
            let tileset = this.buildTileset({});
            TilesetImagePersister.persistImages('root', 'root/output/session-a', 'session-a', [tileset], '', '', '');
            assert.strictEqual(tileset.sessionId, 'session-a');
        });
        await this.runner.test('sets sessionId on multiple tilesets', () => {
            let t1 = this.buildTileset({imageId: 'a.png'});
            let t2 = this.buildTileset({imageId: 'b.png'});
            TilesetImagePersister.persistImages('root', 'root/output/sess', 'sess', [t1, t2], '', '', '');
            assert.strictEqual(t1.sessionId, 'sess');
            assert.strictEqual(t2.sessionId, 'sess');
        });
        await this.runner.test('updates filePath when oldSessionId provided', () => {
            let tileset = this.buildTileset({
                filePath: 'root/input/old/tile.png',
                imageUrl: '/tileset-image/old/tile.png'
            });
            TilesetImagePersister.persistImages('root', 'root/output/new', 'new', [tileset], 'root/input/old', 'root/input/new', 'old');
            assert.ok(tileset.filePath.includes('new'));
            assert.ok(!tileset.filePath.includes('/old/'));
        });
        await this.runner.test('handles empty tilesets array', () => {
            TilesetImagePersister.persistImages('root', 'root/output/sess', 'sess', [], '', '', '');
        });
    }

    async testUpdateCroppedPaths()
    {
        this.runner.group('updateCroppedPaths');
        await this.runner.test('returns null when input is null', () => {
            let result = TilesetImagePersister.updateCroppedPaths(null, 'old', 'new');
            assert.strictEqual(result, null);
        });
        await this.runner.test('replaces session fragment in paths', () => {
            let croppedPaths = this.buildCroppedPaths({
                'tileset.png': {'tree-001': 'generated/output/old-session/cropped/tree.png'}
            });
            TilesetImagePersister.updateCroppedPaths(croppedPaths, 'old-session', 'new-session');
            assert.ok(croppedPaths['tileset.png']['tree-001'].includes('new-session'));
        });
        await this.runner.test('handles multiple tilesets', () => {
            let croppedPaths = this.buildCroppedPaths({
                'a.png': {'rock-001': '/output/old/rock.png'},
                'b.png': {'tree-001': '/output/old/tree.png'}
            });
            TilesetImagePersister.updateCroppedPaths(croppedPaths, 'old', 'new');
            assert.ok(croppedPaths['a.png']['rock-001'].includes('new'));
            assert.ok(croppedPaths['b.png']['tree-001'].includes('new'));
        });
        await this.runner.test('returns the same object reference', () => {
            let croppedPaths = this.buildCroppedPaths({});
            let result = TilesetImagePersister.updateCroppedPaths(croppedPaths, 'old', 'new');
            assert.strictEqual(result, croppedPaths);
        });
    }
}

module.exports.TestTilesetImagePersister = TestTilesetImagePersister;
