/**
 *
 * Reldens - AiAnalyzer
 *
 */

const { MultiAiAnalyzer } = require('./multi-ai-analyzer');
const { ClusterDetector } = require('./cluster-detector');
const { ClusterCropper } = require('./cluster-cropper');
const { ClusterNamer } = require('./cluster-namer');
const { Helpers } = require('./utils/helpers');
let { TilesetConst } = require('./utils/constants');
const { FileHandler } = require('@reldens/server-utils');
const { Logger, sc } = require('@reldens/utils');

class AiAnalyzer
{
    constructor(options)
    {
        this.options = options || {};
        this.validatePass = '1' === sc.get(this.options, 'validatePass', '0');
        this.detector = new ClusterDetector(this.options);
        this.cropper = new ClusterCropper(this.options);
        this.namer = new ClusterNamer(this.options);
    }

    async analyzeImage(
        imageBuffer,
        tilesetColumns,
        tileRows,
        tileWidth,
        tileHeight,
        margin,
        spacing,
        providers,
        bgColorHex,
        onToken,
        onProgress,
        debugDir
    )
    {
        Logger.info(
            'AiAnalyzer: grid='+tilesetColumns+'x'+tileRows
            +' tiles='+tileWidth+'x'+tileHeight+' providers='+providers.join(',')
        );
        let detected = await this.detector.detect(
            imageBuffer,
            tilesetColumns,
            tileRows,
            tileWidth,
            tileHeight,
            margin,
            spacing,
            bgColorHex
        );
        let detectedElements = detected.elements;
        let detectedClusters = detected.clusters;
        let filteredTiles = sc.get(detected, 'filteredTiles', []);
        if(!detectedElements.length && !detectedClusters.length){
            Logger.info('AiAnalyzer: no groups detected');
            return {elements: [], filteredTiles};
        }
        Logger.info(
            'AiAnalyzer: '+detectedElements.length+' element(s)'+detectedClusters.length
            +' cluster(s), providers='+providers.join(',')
        );
        let multiAi = new MultiAiAnalyzer(this.options);
        if(debugDir){
            FileHandler.createFolder(debugDir);
        }
        let cropConfig = {imageBuffer, tileWidth, tileHeight, margin, spacing, bgColorHex, debugDir};
        let rawElements = detectedElements.map(el => ({absoluteTiles: el.tiles, type: TilesetConst.ELEMENT_TYPE}));
        await this.expandClusters(rawElements, detectedClusters, cropConfig, providers, onProgress);
        Logger.info('AiAnalyzer: phase 1 done - '+rawElements.length+' raw element(s) to name');
        if(!providers.length){
            return {
                elements: multiAi.deduplicateNames(rawElements.map((raw, i) => this.buildSkipAiElement(raw, i))),
                filteredTiles
            };
        }
        let elements = await this.nameElements(
            rawElements,
            multiAi,
            cropConfig,
            providers,
            onToken,
            onProgress,
            this.validatePass
        );
        return {elements: multiAi.deduplicateNames(elements), filteredTiles};
    }

    buildSkipAiElement(raw, i)
    {
        let itemType = sc.get(raw, 'type', TilesetConst.ELEMENT_TYPE);
        return {
            name: (TilesetConst.CLUSTER_TYPE === itemType ? 'cluster-' : '')+Helpers.elementName(i + 1),
            type: itemType,
            layers: [{type: 'collisions', tiles: raw.absoluteTiles}]
        };
    }

    buildCollisionElement(tiles, index)
    {
        return {name: Helpers.elementName(index), layers: [{type: 'collisions', tiles}]};
    }

    async cropItem(cropConfig, cluster, prefix, index)
    {
        let result = await this.cropper.crop(
            cropConfig.imageBuffer,
            cluster,
            cropConfig.tileWidth,
            cropConfig.tileHeight,
            cropConfig.margin,
            cropConfig.spacing,
            cropConfig.bgColorHex
        );
        if(cropConfig.debugDir){
            FileHandler.writeFile(
                FileHandler.joinPaths(cropConfig.debugDir, prefix+'-'+index+'.png'),
                result.buffer
            );
        }
        return result;
    }

    async expandClusters(rawElements, detectedClusters, cropConfig, providers, onProgress)
    {
        let total = detectedClusters.length;
        for(let i = 0; i < total; i++){
            let cluster = detectedClusters[i];
            if(onProgress){
                onProgress({phase: 1, cluster: i+1, total});
            }
            let cropResult = await this.cropItem(cropConfig, cluster, 'cluster', i);
            if(!providers.length){
                rawElements.push({absoluteTiles: cluster.tiles, type: TilesetConst.CLUSTER_TYPE});
                continue;
            }
            Logger.info('AiAnalyzer: cluster '+i+'/'+total+' tiles='+cluster.tiles.length+' - sub-detection');
            let subElements = await this.detector.detectSubElements(
                cropResult.buffer,
                cropResult.cropRows,
                cropResult.cropCols,
                cropConfig.tileWidth,
                cropConfig.tileHeight,
                cropConfig.spacing,
                cropConfig.bgColorHex
            );
            if(!subElements.length){
                Logger.info('AiAnalyzer: cluster '+i+' sub-detection empty - using as element');
                rawElements.push({absoluteTiles: cluster.tiles, type: TilesetConst.ELEMENT_TYPE});
                continue;
            }
            this.addSubElements(rawElements, subElements, cluster);
        }
    }

    addSubElements(rawElements, subElements, cluster)
    {
        for(let subElement of subElements){
            let absoluteTiles = subElement.map(t => [t[0]+cluster.minRow, t[1]+cluster.minCol]);
            if(!absoluteTiles.length){
                continue;
            }
            rawElements.push({absoluteTiles, type: TilesetConst.ELEMENT_TYPE});
        }
    }

    async nameElements(rawElements, multiAi, cropConfig, providers, onToken, onProgress, validatePass)
    {
        let elements = [];
        for(let i = 0; i < rawElements.length; i++){
            let raw = rawElements[i];
            if(onProgress){
                onProgress({phase: 2, element: i+1, total: rawElements.length});
            }
            let miniCluster = this.detector.buildSubCluster(raw.absoluteTiles);
            let cropResult = await this.cropItem(cropConfig, miniCluster, 'element', i);
            Logger.info('AiAnalyzer: element '+i+'/'+rawElements.length+' tiles='+raw.absoluteTiles.length+' - naming');
            let result = await multiAi.nameElement(
                cropResult.buffer,
                cropResult.relativeTiles,
                cropResult.cropRows,
                cropResult.cropCols,
                providers,
                i,
                onToken,
                validatePass
            );
            if(!result){
                Logger.info('AiAnalyzer: element '+i+' AI returned null, using placeholder');
                result = this.buildCollisionElement(cropResult.relativeTiles, i + 1);
            }
            if(sc.get(result, 'skip', false)){
                Logger.info('AiAnalyzer: element '+i+' rejected as non-object by AI');
                continue;
            }
            let absoluteLayers = result.layers.map(layer => ({
                type: layer.type,
                tiles: layer.tiles.map(t => [t[0]+miniCluster.minRow, t[1]+miniCluster.minCol])
            }));
            elements.push({name: result.name, type: TilesetConst.ELEMENT_TYPE, layers: absoluteLayers});
        }
        return elements;
    }

    toAbsoluteElement(el, cluster)
    {
        return {
            name: el.name,
            layers: el.layers.map(layer => ({
                type: layer.type,
                tiles: layer.tiles.map(t => [t[0]+cluster.minRow, t[1]+cluster.minCol])
            }))
        };
    }

    async assignLayersAbsolute(imageBuffer, elementTiles, params)
    {
        let miniCluster = this.detector.buildSubCluster(elementTiles);
        let cropResult = await this.cropper.crop(
            imageBuffer,
            miniCluster,
            params.tileWidth,
            params.tileHeight,
            params.margin,
            params.spacing,
            params.bgColor
        );
        let layers = null;
        try {
            layers = await this.namer.assignLayers(
                params.provider,
                cropResult.buffer,
                cropResult.relativeTiles,
                cropResult.cropRows,
                cropResult.cropCols,
                null
            );
        } catch(error) {
            Logger.error('AiAnalyzer: '+params.provider+' layer assignment failed: '+error.message);
        }
        if(!layers){
            return [{type: 'collisions', tiles: elementTiles}];
        }
        return layers.map(layer => ({
            type: layer.type,
            tiles: layer.tiles.map(t => [t[0]+miniCluster.minRow, t[1]+miniCluster.minCol])
        }));
    }

    async detectClusterElements(imageBuffer, clusterTiles, params)
    {
        let rows = clusterTiles.map(t => t[0]);
        let cols = clusterTiles.map(t => t[1]);
        let cluster = {
            tiles: clusterTiles,
            minRow: Math.min(...rows),
            maxRow: Math.max(...rows),
            minCol: Math.min(...cols),
            maxCol: Math.max(...cols)
        };
        if(1 === cluster.tiles.length){
            return [this.buildCollisionElement(cluster.tiles, 1)];
        }
        let cropResult = await this.cropper.crop(
            imageBuffer,
            cluster,
            params.tileWidth,
            params.tileHeight,
            params.margin,
            params.spacing,
            params.bgColor
        );
        let detected = [];
        try {
            detected = await this.namer.detectElements(
                params.provider,
                cropResult.buffer,
                cropResult.cropCols,
                cropResult.cropRows,
                null
            );
        } catch(error) {
            Logger.error('AiAnalyzer: '+params.provider+' detection failed: '+error.message);
        }
        if(!detected.length){
            return [this.buildCollisionElement(cluster.tiles, 1)];
        }
        let elements = [];
        for(let el of detected){
            elements.push(this.toAbsoluteElement(el, cluster));
        }
        return elements;
    }
}

module.exports.AiAnalyzer = AiAnalyzer;
