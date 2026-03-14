/**
 *
 * Reldens - AiNameRoute
 *
 */

let { MultiAiAnalyzer } = require('../multi-ai-analyzer');
let { Helpers } = require('../utils/helpers');
let { TilesetImagePersister } = require('../tileset-image-persister');
let { ClusterDetector } = require('../cluster-detector');
let { ClusterCropper } = require('../cluster-cropper');
let { ClusterNamer } = require('../cluster-namer');
let { RequestParser } = require('./request-parser');
let { sc } = require('@reldens/utils');

class AiNameRoute extends RequestParser
{
    constructor(rootDir)
    {
        super();
        this.rootDir = rootDir;
    }

    async handle(req, res)
    {
        let params = this.parseTilesetParams(req.body);
        let inputElements = sc.get(req.body, 'elements', []);
        if(!this.validateAiParams(params, res)){
            return;
        }
        if(!inputElements.length){
            res.json({elements: []});
            return;
        }
        let imageBuffer = await TilesetImagePersister.loadImageBuffer(params.sessionId, params.imageId, this.rootDir);
        let detector = new ClusterDetector();
        let cropper = new ClusterCropper();
        let namer = new ClusterNamer();
        let elements = [];
        for(let i = 0; i < inputElements.length; i++){
            let absoluteTiles = sc.get(inputElements[i], 'absoluteTiles', []);
            if(!absoluteTiles.length){
                continue;
            }
            let miniCluster = detector.buildSubCluster(absoluteTiles);
            let cropResult = await cropper.crop(
                imageBuffer,
                miniCluster,
                params.tileWidth,
                params.tileHeight,
                params.margin,
                params.spacing,
                params.bgColor
            );
            let name = await namer.nameOnly(params.provider, cropResult.buffer, null);
            elements.push({name: name || Helpers.elementName(i + 1)});
        }
        let multiAi = new MultiAiAnalyzer();
        res.json({elements: multiAi.deduplicateNames(elements)});
    }
}

module.exports.AiNameRoute = AiNameRoute;
