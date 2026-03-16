/**
 *
 * Reldens - AiAssignLayersRoute
 *
 */

let { AiAnalyzer } = require('../ai-analyzer');
let { TilesetImagePersister } = require('../tileset-image-persister');
let { RequestParser } = require('./request-parser');
let { sc } = require('@reldens/utils');

class AiAssignLayersRoute extends RequestParser
{
    constructor(rootDir, options)
    {
        super();
        this.rootDir = rootDir;
        this.options = options || {};
    }

    async handle(req, res)
    {
        let params = this.parseTilesetParams(req.body);
        let elementTiles = sc.get(req.body, 'elementTiles', []);
        if(!this.validateAiParams(params, res)){
            return;
        }
        if(!elementTiles.length){
            res.json({layers: []});
            return;
        }
        let imageBuffer = await TilesetImagePersister.loadImageBuffer(params.sessionId, params.imageId, this.rootDir);
        let analyzer = new AiAnalyzer(this.options);
        let layers = await analyzer.assignLayersAbsolute(imageBuffer, elementTiles, params);
        res.json({layers});
    }
}

module.exports.AiAssignLayersRoute = AiAssignLayersRoute;
