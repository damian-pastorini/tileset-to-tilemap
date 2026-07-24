/**
 *
 * Reldens - AiDetectRoute
 *
 */

const { AiAnalyzer } = require('../ai-analyzer');
const { MultiAiAnalyzer } = require('../multi-ai-analyzer');
const { TilesetImagePersister } = require('../tileset-image-persister');
const { ClusterDetector } = require('../cluster-detector');
const { RequestParser } = require('./request-parser');
const { Logger, sc } = require('@reldens/utils');

class AiDetectRoute extends RequestParser
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
        let tilesetColumns = sc.get(req.body, 'tilesetColumns', 0);
        let tileRows = sc.get(req.body, 'tileRows', 0);
        let clusterTiles = sc.get(req.body, 'clusterTiles', null);
        if(!this.validateAiParams(params, res)){
            return;
        }
        try {
            let imageBuffer = await TilesetImagePersister.loadImageBuffer(params.sessionId, params.imageId, this.rootDir);
            let analyzer = new AiAnalyzer(this.options);
            let multiAi = new MultiAiAnalyzer(this.options);
            if(sc.isArray(clusterTiles) && clusterTiles.length){
                let elements = await analyzer.detectClusterElements(imageBuffer, clusterTiles, params);
                res.json({elements: multiAi.deduplicateNames(elements)});
                return;
            }
            let detector = new ClusterDetector(this.options);
            let detected = await detector.detect({
                imageBuffer,
                tilesetColumns,
                tileRows,
                tileWidth: params.tileWidth,
                tileHeight: params.tileHeight,
                margin: params.margin,
                spacing: params.spacing,
                bgColorHex: params.bgColor
            });
            let clusters = detected.clusters;
            if(!clusters.length){
                res.json({elements: []});
                return;
            }
            let elements = [];
            for(let cluster of clusters){
                let clusterElements = await analyzer.detectClusterElements(imageBuffer, cluster.tiles, params);
                elements.push(...clusterElements);
            }
            res.json({elements: multiAi.deduplicateNames(elements)});
        } catch(error) {
            Logger.error('AiDetectRoute: detection failed: '+error.message, error.stack);
            if(!res.headersSent){
                res.status(500).json({error: error.message || 'AI detect failed'});
            }
        }
    }
}

module.exports.AiDetectRoute = AiDetectRoute;
