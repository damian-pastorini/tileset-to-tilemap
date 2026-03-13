/**
 *
 * Reldens - ClusterDetector
 *
 */

const { TilePixelAnalyzer } = require('./tile-pixel-analyzer');
const { TileBoundsCalculator } = require('./tile-bounds-calculator');
const { Helpers } = require('./utils/helpers');
const sharp = require('sharp');
const { Mask, fromMask } = require('image-js');
const { Logger, sc } = require('@reldens/utils');

class ClusterDetector
{
    constructor()
    {
        this.pixelAnalyzer = new TilePixelAnalyzer();
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

    roisToTileGroups(rois, stepX, stepY, tileWidth, tileHeight, margin, tilesetColumns, tileRows, tileGrid)
    {
        let groups = [];
        for(let roiItem of rois){
            if(roiItem.id < 0){
                continue;
            }
            let tileKeySet = new Set();
            for(let point of roiItem.points(true)){
                let relX = point.column - margin;
                let relY = point.row - margin;
                if(relX < 0 || relY < 0){
                    continue;
                }
                if(relX % stepX >= tileWidth || relY % stepY >= tileHeight){
                    continue;
                }
                let tileCol = Math.floor(relX / stepX);
                let tileRow = Math.floor(relY / stepY);
                if(tileCol >= tilesetColumns || tileRow >= tileRows){
                    continue;
                }
                if(tileGrid && !tileGrid[tileRow][tileCol]){
                    continue;
                }
                tileKeySet.add(Helpers.tileKey([tileRow, tileCol]));
            }
            if(!tileKeySet.size){
                continue;
            }
            groups.push([...tileKeySet].map(k => {
                let parts = k.split(',');
                return [Number(parts[0]), Number(parts[1])];
            }));
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

    applySplitByGap(clusters, minClusterTiles)
    {
        let splitClusters = [];
        let splitCount = 0;
        for(let cluster of clusters){
            let parts = this.splitCluster(cluster);
            for(let part of parts){
                if(part.tiles.length < minClusterTiles){
                    continue;
                }
                splitClusters.push(part);
            }
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
            alphaThreshold: Number(sc.get(process.env, 'CLUSTER_EMPTY_ALPHA_THRESHOLD', '10')),
            colorThreshold: Number(sc.get(process.env, 'CLUSTER_COLOR_DISTANCE', '30')),
            minClusterTiles: Number(sc.get(process.env, 'MIN_CLUSTER_TILES', '1')),
            varianceThreshold: Number(sc.get(process.env, 'CLUSTER_VARIANCE_THRESHOLD', '0')),
            minFillPct: Number(sc.get(process.env, 'CLUSTER_MIN_TILE_FILL_PCT', '5')),
            splitByGap: '1' === sc.get(process.env, 'CLUSTER_SPLIT_BY_GAP', '1'),
            elementBorderThreshold: Number(sc.get(process.env, 'ELEMENT_BORDER_COLOR_DISTANCE', '20'))
        };
    }

    buildTileGrid(
        data,
        info,
        bgColor,
        alphaThreshold,
        colorThreshold,
        minFillPct,
        varianceThreshold,
        tilesetColumns,
        tileRows,
        tileWidth,
        tileHeight,
        margin,
        spacing
    ) {
        let tileGrid = [];
        let filteredTiles = [];
        let nonEmptyRaw = 0;
        let nonEmptyCount = 0;
        let varianceMin = Infinity;
        let varianceMax = 0;
        let varianceSum = 0;
        let channels = info.channels;
        let imageWidth = info.width;
        for(let r = 0; r < tileRows; r++){
            tileGrid[r] = [];
            for(let c = 0; c < tilesetColumns; c++){
                let tileX = margin + c * (tileWidth + spacing);
                let tileY = margin + r * (tileHeight + spacing);
                let isEmpty = this.pixelAnalyzer.isTileEmpty(
                    data, imageWidth, channels,
                    tileX, tileY, tileWidth, tileHeight,
                    bgColor, alphaThreshold, colorThreshold, minFillPct
                );
                tileGrid[r][c] = !isEmpty;
                if(!isEmpty){
                    nonEmptyRaw++;
                    let variance = this.pixelAnalyzer.computeTileVariance(
                        data, imageWidth, channels, tileX, tileY, tileWidth, tileHeight
                    );
                    if(variance < varianceMin){ varianceMin = variance; }
                    if(variance > varianceMax){ varianceMax = variance; }
                    varianceSum += variance;
                    if(varianceThreshold > 0 && variance < varianceThreshold){
                        tileGrid[r][c] = false;
                        filteredTiles.push([r, c]);
                    }
                }
                if(tileGrid[r][c]){
                    nonEmptyCount++;
                }
            }
        }
        return {tileGrid, filteredTiles, nonEmptyRaw, nonEmptyCount, varianceMin, varianceMax, varianceSum};
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
        let gridResult = this.buildTileGrid(
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
        let maskData = this.pixelAnalyzer.buildMaskData(
            data,
            info.width,
            info.height,
            info.channels,
            cfg.alphaThreshold,
            bgColor,
            cfg.colorThreshold
        );
        let mask = new Mask(info.width, info.height, { data: maskData });
        let tileGroups = this.roisToTileGroups(
            fromMask(mask).getRois(),
            stepX,
            stepY,
            tileWidth,
            tileHeight,
            margin,
            tilesetColumns,
            tileRows,
            null
        );
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
        let maskData = this.pixelAnalyzer.buildMaskData(
            data,
            info.width,
            info.height,
            4,
            cfg.alphaThreshold,
            bgColor,
            cfg.colorThreshold
        );
        let mask = new Mask(info.width, info.height, {data: maskData});
        let tileGroups = this.roisToTileGroups(
            fromMask(mask.erode()).getRois(),
            tileWidth + spacing,
            tileHeight + spacing,
            tileWidth,
            tileHeight,
            0,
            cropCols,
            cropRows,
            null
        );
        Logger.info('ClusterDetector: '+tileGroups.length+' sub-element(s) in '+cropCols+'x'+cropRows+' tile cluster');
        return tileGroups;
    }
}

module.exports.ClusterDetector = ClusterDetector;
