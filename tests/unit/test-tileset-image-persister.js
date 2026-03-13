let { TestRunner, assert } = require('../lib/test-runner');
let { TilesetImagePersister } = require('../../lib/tileset-image-persister');

class TestTilesetImagePersister
{
    constructor()
    {
        this.runner = new TestRunner();
    }

    async testUpdateTilesetPaths()
    {
        this.runner.suite('TilesetImagePersister');
        this.runner.group('updateTilesetPaths');
        await this.runner.test('replaces oldInputDir in filePath', () => {
            let tileset = {filePath: 'generated/input/old-session/tileset.png', imageUrl: ''};
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
            let tileset = {filePath: 'generated/output/old-session/merged.png', imageUrl: ''};
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
            let tileset = {filePath: '', imageUrl: '/tileset-image/old-session/file.png'};
            TilesetImagePersister.updateTilesetPaths(
                tileset,
                '',
                '',
                '',
                '',
                'old-session',
                'new-session'
            );
            assert.ok(tileset.imageUrl.includes('new-session'));
            assert.ok(!tileset.imageUrl.includes('old-session'));
        });
        await this.runner.test('leaves paths unchanged when no old dirs', () => {
            let tileset = {filePath: 'some/path/file.png', imageUrl: '/tileset-image/session/file.png'};
            TilesetImagePersister.updateTilesetPaths(tileset, '', '', '', '', null, 'session');
            assert.strictEqual(tileset.filePath, 'some/path/file.png');
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
            let croppedPaths = {
                'tileset.png': {
                    'tree-001': 'generated/output/old-session/cropped/tree.png'
                }
            };
            TilesetImagePersister.updateCroppedPaths(croppedPaths, 'old-session', 'new-session');
            assert.ok(croppedPaths['tileset.png']['tree-001'].includes('new-session'));
        });
        await this.runner.test('handles multiple tilesets', () => {
            let croppedPaths = {
                'a.png': {'rock-001': '/output/old/rock.png'},
                'b.png': {'tree-001': '/output/old/tree.png'}
            };
            TilesetImagePersister.updateCroppedPaths(croppedPaths, 'old', 'new');
            assert.ok(croppedPaths['a.png']['rock-001'].includes('new'));
            assert.ok(croppedPaths['b.png']['tree-001'].includes('new'));
        });
        await this.runner.test('returns the same object reference', () => {
            let croppedPaths = {'a.png': {'x-001': '/output/old/x.png'}};
            let result = TilesetImagePersister.updateCroppedPaths(croppedPaths, 'old', 'new');
            assert.strictEqual(result, croppedPaths);
        });
    }
}

module.exports.TestTilesetImagePersister = TestTilesetImagePersister;
