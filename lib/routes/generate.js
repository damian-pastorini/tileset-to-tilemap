/**
 *
 * Reldens - GenerateRoute
 *
 */

let { TilesetFilesBuilder } = require('../tileset-files-builder');
let { Helpers } = require('../utils/helpers');
let { FileHandler } = require('@reldens/server-utils');
let { sc } = require('@reldens/utils');

class GenerateRoute
{
    constructor(rootDir)
    {
        this.rootDir = rootDir;
    }

    async handle(req, res)
    {
        let sessionId = Helpers.sanitizeSessionId(sc.get(req.body, 'sessionId', ''));
        let tilesets = sc.get(req.body, 'tilesets', []);
        let fullTilesets = sc.get(req.body, 'fullTilesets', tilesets);
        let mapName = sc.get(req.body, 'mapName', 'tileset-elements');
        let mapTitle = sc.get(req.body, 'mapTitle', 'Tileset Elements');
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
        let builder = new TilesetFilesBuilder();
        let files = await builder.build(this.rootDir, sessionId, outputDir, tilesets, fullTilesets, mapName, mapTitle);
        res.json({files});
    }
}

module.exports.GenerateRoute = GenerateRoute;
