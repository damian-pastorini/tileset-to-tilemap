/**
 *
 * Reldens - MergeTilesetFilter
 *
 */

const { TilesetConst } = require('./constants');
const { ElementBuilder } = require('./element-builder');
const { TilesetResizer } = require('./tileset-resizer');
const { Helpers } = require('./helpers');
const { FileHandler } = require('@reldens/server-utils');
const { sc } = require('@reldens/utils');

class MergeTilesetFilter
{
    filterTilesetElements(tileset, includeElements, includeClusters)
    {
        let noFilter = !includeElements && !includeClusters;
        let filtered = [];
        for(let element of tileset.elements){
            if(noFilter){
                filtered.push(element);
                continue;
            }
            if(includeElements && TilesetConst.CLUSTER_TYPE !== element.type){
                filtered.push(element);
                continue;
            }
            if(includeClusters && TilesetConst.CLUSTER_TYPE === element.type){
                filtered.push(element);
            }
        }
        return filtered;
    }

    buildElementJsonIfNeeded(element, tileset, outputDir, tilesetBasename)
    {
        let elementFilename = tilesetBasename+'-'+element.name+'.json';
        let elementsDir = FileHandler.joinPaths(outputDir, TilesetConst.OUTPUT_ELEMENTS_SUB_FOLDER);
        let elementPath = FileHandler.joinPaths(elementsDir, elementFilename);
        if(FileHandler.exists(elementPath)){
            return;
        }
        let elementBuilder = new ElementBuilder();
        let elementJson = elementBuilder.buildElementJSON(element, tileset);
        if(!elementJson){
            return;
        }
        FileHandler.writeFile(elementPath, sc.toJsonString(elementJson, null, 4));
    }

    async resizeTilesetForMerge(filteredTileset, refTileWidth, outputDir, tilesetResizer)
    {
        let resizedFilename = 'resized-'+filteredTileset.filename;
        let resizedPath = FileHandler.joinPaths(outputDir, resizedFilename);
        let resized = await tilesetResizer.resize(
            filteredTileset.filePath,
            filteredTileset.tileWidth,
            filteredTileset.tileHeight,
            refTileWidth,
            resizedPath
        );
        if(!resized){
            return false;
        }
        filteredTileset.filePath = resizedPath;
        filteredTileset.filename = resizedFilename;
        filteredTileset.tileWidth = refTileWidth;
        filteredTileset.tileHeight = resized.tileHeight;
        filteredTileset.imageWidth = resized.imageWidth;
        filteredTileset.imageHeight = resized.imageHeight;
        filteredTileset.tilesetColumns = Helpers.calcTileColumns(
            resized.imageWidth,
            sc.get(filteredTileset, 'margin', 0),
            sc.get(filteredTileset, 'spacing', 0),
            resized.tileWidth
        );
        filteredTileset.tileRows = Helpers.calcTileRows(
            resized.imageHeight,
            sc.get(filteredTileset, 'margin', 0),
            sc.get(filteredTileset, 'spacing', 0),
            resized.tileHeight
        );
        filteredTileset.tileCount = filteredTileset.tilesetColumns * filteredTileset.tileRows;
        return true;
    }

    filterMergeTilesets(tilesetsMergeData)
    {
        let filteredTilesets = [];
        let originalStateIndices = [];
        for(let mergeData of tilesetsMergeData){
            let tileset = mergeData.tileset;
            let includeElements = sc.get(mergeData, 'includeElements', false);
            let includeClusters = sc.get(mergeData, 'includeClusters', false);
            let filteredElements = this.filterTilesetElements(tileset, includeElements, includeClusters);
            let hasSpots = sc.isArray(tileset.spots) && 0 < tileset.spots.length;
            if(!filteredElements.length && !hasSpots){
                continue;
            }
            let autoResize = sc.get(mergeData, 'autoResize', false);
            filteredTilesets.push(Object.assign({}, tileset, {elements: filteredElements, autoResize}));
            originalStateIndices.push(mergeData.stateIndex);
        }
        return {filteredTilesets, originalStateIndices};
    }

    resolveRefTileSize(filteredTilesets, resizeStrategy)
    {
        let allTileSizes = filteredTilesets.map(tileset => ({w: tileset.tileWidth, h: tileset.tileHeight}));
        if('bigger' === resizeStrategy){
            return {
                refTileWidth: Math.max(...allTileSizes.map(size => size.w)),
                refTileHeight: Math.max(...allTileSizes.map(size => size.h))
            };
        }
        return {
            refTileWidth: Math.min(...allTileSizes.map(size => size.w)),
            refTileHeight: Math.min(...allTileSizes.map(size => size.h))
        };
    }

    async prepareFilteredTileset(filteredTileset, refTileWidth, outputDir, onProgress)
    {
        if(filteredTileset.filePath){
            FileHandler.copyFile(
                filteredTileset.filePath,
                FileHandler.joinPaths(outputDir, filteredTileset.filename)
            );
        }
        if(filteredTileset.autoResize
            && (filteredTileset.tileWidth !== refTileWidth || filteredTileset.tileHeight !== refTileWidth)){
            onProgress('Resizing '+filteredTileset.filename+'...');
            let tilesetResizer = new TilesetResizer();
            let resized = await this.resizeTilesetForMerge(filteredTileset, refTileWidth, outputDir, tilesetResizer);
            if(!resized){
                return false;
            }
        }
        let tilesetBasename = filteredTileset.filename.replace(/\.[^.]+$/, '');
        FileHandler.createFolder(FileHandler.joinPaths(outputDir, TilesetConst.OUTPUT_ELEMENTS_SUB_FOLDER));
        for(let element of filteredTileset.elements){
            this.buildElementJsonIfNeeded(element, filteredTileset, outputDir, tilesetBasename);
        }
        return true;
    }
}

module.exports.MergeTilesetFilter = MergeTilesetFilter;
