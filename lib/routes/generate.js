/**
 *
 * Reldens - GenerateRoute
 *
 */

const { TilesetFilesBuilder } = require('../tileset-files-builder');
const { Helpers } = require('../helpers');
const { FileHandler } = require('@reldens/server-utils');
const { Logger, sc } = require('@reldens/utils');

class GenerateRoute
{
    constructor(rootDir, options)
    {
        this.rootDir = rootDir;
        this.options = options || {};
    }

    async handle(req, res)
    {
        let sessionId = Helpers.sanitizeSessionId(sc.get(req.body, 'sessionId', ''));
        let tilesets = sc.get(req.body, 'tilesets', []);
        let fullTilesets = sc.get(req.body, 'fullTilesets', tilesets);
        let mapName = sc.get(req.body, 'mapName', 'tileset-elements');
        let mapTitle = sc.get(req.body, 'mapTitle', 'Tileset Elements');
        let globalTileOptions = sc.get(req.body, 'globalTileOptions', null);
        if(!sessionId){
            res.status(400).json({error: 'Session ID required'});
            return;
        }
        if(!sc.isArray(tilesets)){
            res.status(400).json({error: 'No tilesets provided'});
            return;
        }
        if(!tilesets.length){
            res.status(400).json({error: 'No tilesets provided'});
            return;
        }
        let outputDir = FileHandler.joinPaths(this.rootDir, 'output', sessionId);
        FileHandler.createFolder(outputDir);
        let builder = new TilesetFilesBuilder(this.options);
        try {
            let files = await builder.build(
                this.rootDir,
                sessionId,
                outputDir,
                tilesets,
                fullTilesets,
                mapName,
                mapTitle,
                globalTileOptions
            );
            res.json({files});
        } catch(error) {
            Logger.error('GenerateRoute: failed to build files for session "'+sessionId+'": '+error.message, error.stack);
            if(!res.headersSent){
                res.status(500).json({error: error.message || 'Failed to generate files'});
            }
        }
    }
}

module.exports.GenerateRoute = GenerateRoute;
