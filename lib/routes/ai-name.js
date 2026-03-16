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
    constructor(rootDir, options)
    {
        super();
        this.rootDir = rootDir;
        this.options = options || {};
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
        let detector = new ClusterDetector(this.options);
        let cropper = new ClusterCropper(this.options);
        let namer = new ClusterNamer(this.options);
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
        let multiAi = new MultiAiAnalyzer(this.options);
        res.json({elements: multiAi.deduplicateNames(elements)});
    }
}

module.exports.AiNameRoute = AiNameRoute;
