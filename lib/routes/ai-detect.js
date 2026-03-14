/**
 *
 * Reldens - AiDetectRoute
 *
 */

let { AiAnalyzer } = require('../ai-analyzer');
let { MultiAiAnalyzer } = require('../multi-ai-analyzer');
let { TilesetImagePersister } = require('../tileset-image-persister');
let { ClusterDetector } = require('../cluster-detector');
let { RequestParser } = require('./request-parser');
let { sc } = require('@reldens/utils');

class AiDetectRoute extends RequestParser
{
    constructor(rootDir)
    {
        super();
        this.rootDir = rootDir;
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
        let imageBuffer = await TilesetImagePersister.loadImageBuffer(params.sessionId, params.imageId, this.rootDir);
        let analyzer = new AiAnalyzer();
        let multiAi = new MultiAiAnalyzer();
        if(sc.isArray(clusterTiles) && clusterTiles.length){
            let elements = await analyzer.detectClusterElements(imageBuffer, clusterTiles, params);
            res.json({elements: multiAi.deduplicateNames(elements)});
            return;
        }
        let detector = new ClusterDetector();
        let detected = await detector.detect(
            imageBuffer,
            tilesetColumns,
            tileRows,
            params.tileWidth,
            params.tileHeight,
            params.margin,
            params.spacing,
            params.bgColor
        );
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
    }
}

module.exports.AiDetectRoute = AiDetectRoute;
