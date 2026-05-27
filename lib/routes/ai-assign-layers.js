/**
 *
 * Reldens - AiAssignLayersRoute
 *
 */

const { AiAnalyzer } = require('../ai-analyzer');
const { TilesetImagePersister } = require('../tileset-image-persister');
const { RequestParser } = require('./request-parser');
const { Logger, sc } = require('@reldens/utils');

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
        try {
            let imageBuffer = await TilesetImagePersister.loadImageBuffer(params.sessionId, params.imageId, this.rootDir);
            let analyzer = new AiAnalyzer(this.options);
            let layers = await analyzer.assignLayersAbsolute(imageBuffer, elementTiles, params);
            res.json({layers});
        } catch(error) {
            Logger.error('AiAssignLayersRoute: layer assignment failed: '+error.message, error.stack);
            if(!res.headersSent){
                res.status(500).json({error: error.message || 'AI assign layers failed'});
            }
        }
    }
}

module.exports.AiAssignLayersRoute = AiAssignLayersRoute;
