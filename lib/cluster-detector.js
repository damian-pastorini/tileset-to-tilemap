/**
 *
 * Reldens - ClusterDetector
 *
 */

const { TilePixelAnalyzer } = require('./tile-pixel-analyzer');
const { TileGridBuilder } = require('./tile-grid-builder');
const { TileBoundsCalculator } = require('./tile-bounds-calculator');
const { TileGroupMerger } = require('./tile-group-merger');
const { Helpers } = require('./utils/helpers');
const sharp = require('sharp');
const { Mask, fromMask } = require('image-js');
const { Logger, sc } = require('@reldens/utils');

class ClusterDetector
{
    constructor(options)
    {
        this.options = options || {};
        this.pixelAnalyzer = new TilePixelAnalyzer();
        this.gridBuilder = new TileGridBuilder(this.pixelAnalyzer);
        this.merger = new TileGroupMerger();
    }

    buildSubCluster(tiles)
    {
        return {tiles, ...TileBoundsCalculator.fromTiles(tiles)};
    }

    splitOnAxis(cluster, axis, min, max)
    {
        let axisSet = new Set(cluster.tiles.map(t => t[axis]));
        for(let v = min; v <= max; v++){
            if(axisSet.has(v)){
                continue;
            }
            let lower = cluster.tiles.filter(t => t[axis] < v);
            let upper = cluster.tiles.filter(t => t[axis] > v);
            if(!lower.length || !upper.length){
                continue;
            }
            return [
                ...this.splitCluster(this.buildSubCluster(lower)),
                ...this.splitCluster(this.buildSubCluster(upper))
            ];
        }
        return null;
    }

    splitCluster(cluster)
    {
        return this.splitOnAxis(cluster, 0, cluster.minRow, cluster.maxRow)
            || this.splitOnAxis(cluster, 1, cluster.minCol, cluster.maxCol)
            || [cluster];
    }

    buildGridParams(stepX, stepY, tileWidth, tileHeight, margin, tilesetColumns, tileRows, tileGrid)
    {
        return {stepX, stepY, tileWidth, tileHeight, margin, tilesetColumns, tileRows, tileGrid};
    }

    buildTileKeySetForRoi(roiItem, gp)
    {
        let tileKeySet = new Set();
        for(let point of roiItem.points(true)){
            let relX = point.column - gp.margin;
            let relY = point.row - gp.margin;
            if(relX < 0 || relY < 0){
                continue;
            }
            if(relX % gp.stepX >= gp.tileWidth || relY % gp.stepY >= gp.tileHeight){
                continue;
            }
            let tileCol = Math.floor(relX / gp.stepX);
            let tileRow = Math.floor(relY / gp.stepY);
            if(tileCol >= gp.tilesetColumns || tileRow >= gp.tileRows){
                continue;
            }
            if(gp.tileGrid && !gp.tileGrid[tileRow][tileCol]){
                continue;
            }
            tileKeySet.add(Helpers.tileKey([tileRow, tileCol]));
        }
        return tileKeySet;
    }

    tileKeySetToTiles(tileKeySet)
    {
        let tiles = [];
        for(let k of tileKeySet){
            let parts = k.split(',');
            tiles.push([Number(parts[0]), Number(parts[1])]);
        }
        return tiles;
    }

    roisToTileGroups(rois, gp)
    {
        let groups = [];
        for(let roiItem of rois){
            if(roiItem.id < 0){
                continue;
            }
            let tileKeySet = this.buildTileKeySetForRoi(roiItem, gp);
            if(!tileKeySet.size){
                continue;
            }
            groups.push(this.tileKeySetToTiles(tileKeySet));
        }
        return groups;
    }

    buildClusters(tileGroups, minClusterTiles)
    {
        let clusters = [];
        let filteredCount = 0;
        for(let tiles of tileGroups){
            if(tiles.length < minClusterTiles){
                filteredCount++;
                continue;
            }
            clusters.push(this.buildSubCluster(tiles));
        }
        if(filteredCount){
            Logger.info('ClusterDetector: filtered '+filteredCount+' cluster(s) below '+minClusterTiles);
        }
        return clusters;
    }

    collectValidParts(splitClusters, parts, minClusterTiles)
    {
        for(let part of parts){
            if(part.tiles.length < minClusterTiles){
                continue;
            }
            splitClusters.push(part);
        }
    }

    applySplitByGap(clusters, minClusterTiles)
    {
        let splitClusters = [];
        let splitCount = 0;
        for(let cluster of clusters){
            let parts = this.splitCluster(cluster);
            this.collectValidParts(splitClusters, parts, minClusterTiles);
            if(parts.length > 1){
                splitCount += parts.length - 1;
            }
        }
        if(splitCount){
            Logger.info('ClusterDetector: gap-split produced '+splitCount+' additional cluster(s)');
        }
        return splitClusters;
    }

    classifyGroups(
        clusters,
        data,
        info,
        tileWidth,
        tileHeight,
        margin,
        spacing,
        bgColor,
        alphaThreshold,
        colorThreshold,
        elementBorderThreshold
    ) {
        let elements = [];
        let clusterResult = [];
        let channels = info.channels;
        let imageWidth = info.width;
        for(let group of clusters){
            if(1 === group.tiles.length
                || this.pixelAnalyzer.isElementGroup(
                    group.tiles, data, imageWidth, channels,
                    tileWidth, tileHeight, margin, spacing,
                    bgColor, alphaThreshold, colorThreshold, elementBorderThreshold
                )
            ){
                elements.push(group);
                continue;
            }
            clusterResult.push(group);
        }
        return {elements, clusters: clusterResult};
    }

    loadDetectConfig()
    {
        return {
            alphaThreshold: Number(sc.get(this.options, 'alphaThreshold', 10)),
            colorThreshold: Number(sc.get(this.options, 'colorThreshold', 30)),
            minClusterTiles: Number(sc.get(this.options, 'minClusterTiles', 1)),
            varianceThreshold: Number(sc.get(this.options, 'varianceThreshold', 0)),
            minFillPct: Number(sc.get(this.options, 'minFillPct', 5)),
            splitByGap: '1' === sc.get(this.options, 'splitByGap', '1'),
            elementBorderThreshold: Number(sc.get(this.options, 'elementBorderThreshold', 20))
        };
    }

    buildMaskFromBuffer(data, info, channels, cfg, bgColor)
    {
        return this.pixelAnalyzer.buildMaskData(
            data,
            info.width,
            info.height,
            channels,
            cfg.alphaThreshold,
            bgColor,
            cfg.colorThreshold
        );
    }

    async detect(imageBuffer, tilesetColumns, tileRows, tileWidth, tileHeight, margin, spacing, bgColorHex)
    {
        let cfg = this.loadDetectConfig();
        let bgColor = bgColorHex ? this.pixelAnalyzer.parseHexColor(bgColorHex) : null;
        Logger.info(
            'ClusterDetector: grid='+tilesetColumns+'x'+tileRows
            +' tileSize='+tileWidth+'x'+tileHeight
            +' margin='+margin+' spacing='+spacing
            +' bgColor='+(bgColorHex || 'none')
            +' cfg='+sc.toJsonString(cfg)
        );
        let { data, info } = await sharp(imageBuffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
        Logger.info('ClusterDetector: image='+info.width+'x'+info.height+' channels='+info.channels);
        let gridResult = this.gridBuilder.build(
            data,
            info,
            bgColor,
            cfg.alphaThreshold,
            cfg.colorThreshold,
            cfg.minFillPct,
            cfg.varianceThreshold,
            tilesetColumns,
            tileRows,
            tileWidth,
            tileHeight,
            margin,
            spacing
        );
        let nonEmptyLog = 'ClusterDetector: non-empty tiles='+gridResult.nonEmptyRaw+'/'+tilesetColumns*tileRows;
        if(cfg.varianceThreshold > 0){
            nonEmptyLog += ' ('+gridResult.nonEmptyCount+' pass variance>='+cfg.varianceThreshold+')';
        }
        if(gridResult.nonEmptyRaw > 0){
            nonEmptyLog += ' variance min='+Math.round(gridResult.varianceMin)
                +' max='+Math.round(gridResult.varianceMax)
                +' mean='+Math.round(gridResult.varianceSum/gridResult.nonEmptyRaw);
        }
        Logger.info(nonEmptyLog);
        let stepX = tileWidth + spacing;
        let stepY = tileHeight + spacing;
        let maskData = this.buildMaskFromBuffer(data, info, info.channels, cfg, bgColor);
        let mask = new Mask(info.width, info.height, { data: maskData });
        let gp = this.buildGridParams(stepX, stepY, tileWidth, tileHeight, margin, tilesetColumns, tileRows, null);
        let tileGroups = this.roisToTileGroups(fromMask(mask).getRois(), gp);
        tileGroups = this.merger.merge(tileGroups);
        let clusters = this.buildClusters(tileGroups, cfg.minClusterTiles);
        if(cfg.splitByGap){
            clusters = this.applySplitByGap(clusters, cfg.minClusterTiles);
        }
        let classified = this.classifyGroups(
            clusters,
            data,
            info,
            tileWidth,
            tileHeight,
            margin,
            spacing,
            bgColor,
            cfg.alphaThreshold,
            cfg.colorThreshold,
            cfg.elementBorderThreshold
        );
        Logger.info(
            'ClusterDetector: found '+classified.elements.length+' element(s)'
            +' and '+classified.clusters.length+' cluster(s)'
            +' elements='+sc.toJsonString(classified.elements)
            +' clusters='+sc.toJsonString(classified.clusters)
        );
        return {elements: classified.elements, clusters: classified.clusters, filteredTiles: gridResult.filteredTiles};
    }

    async detectSubElements(cropBuffer, cropRows, cropCols, tileWidth, tileHeight, spacing, bgColorHex)
    {
        let cfg = this.loadDetectConfig();
        let bgColor = bgColorHex ? this.pixelAnalyzer.parseHexColor(bgColorHex) : null;
        let { data, info } = await sharp(cropBuffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
        let maskData = this.buildMaskFromBuffer(data, info, 4, cfg, bgColor);
        let mask = new Mask(info.width, info.height, {data: maskData});
        let gp = this.buildGridParams(
            tileWidth + spacing,
            tileHeight + spacing,
            tileWidth,
            tileHeight,
            0,
            cropCols,
            cropRows,
            null
        );
        let tileGroups = this.roisToTileGroups(fromMask(mask.erode()).getRois(), gp);
        Logger.info('ClusterDetector: '+tileGroups.length+' sub-element(s) in '+cropCols+'x'+cropRows+' tile cluster');
        return tileGroups;
    }
}

module.exports.ClusterDetector = ClusterDetector;
