/**
 *
 * Reldens - TilesetsMerge
 *
 */

const { MergeTilesetFilter } = require('./merge-tileset-filter');
const { CompositeBuilder } = require('./composite-builder');
const { ElementBuilder } = require('./element-builder');
const { AnnotatedImageBuilder } = require('./annotated-image-builder');
const { TilesetImageMerger } = require('./tileset-image-merger');
const { MapFormatter } = require('./map-formatter');
const { TilesetConst } = require('./constants');
const { FileHandler } = require('@reldens/server-utils');
const { Logger, sc } = require('@reldens/utils');

class TilesetsMerge
{
    remapElementTiles(element, rowOffset, colOffset)
    {
        return {
            name: element.name,
            type: element.type,
            approved: element.approved,
            bulkSelected: sc.get(element, 'bulkSelected', false),
            quantity: sc.get(element, 'quantity', 1),
            freeSpaceAround: sc.get(element, 'freeSpaceAround', 1),
            allowPathsInFreeSpace: sc.get(element, 'allowPathsInFreeSpace', false),
            layers: element.layers.map(layer => ({
                type: layer.type,
                tiles: layer.tiles.map(tile => [tile[0] + rowOffset, tile[1] + colOffset])
            }))
        };
    }

    async buildTilesetOutput(tileset, outputDir)
    {
        let elementBuilder = new ElementBuilder();
        let annotatedImageBuilder = new AnnotatedImageBuilder();
        let tilesetBasename = tileset.filename.replace(/\.[^.]+$/, '');
        let mergedDir = FileHandler.joinPaths(outputDir, TilesetConst.OUTPUT_MERGED_SUB_FOLDER);
        FileHandler.createFolder(mergedDir);
        for(let element of tileset.elements){
            let elementJson = elementBuilder.buildElementJSON(element, tileset);
            if(!elementJson){
                Logger.error('TilesetsMerge: element '+element.name+' has no tiles, skipping');
                continue;
            }
            let elementFilename = tilesetBasename+'-'+element.name+'.json';
            FileHandler.writeFile(
                FileHandler.joinPaths(mergedDir, elementFilename),
                MapFormatter.formatMap(elementJson)
            );
        }
        let annotatedDir = FileHandler.joinPaths(
            outputDir,
            '..',
            '..',
            '..',
            'generated',
            TilesetConst.GENERATED_ANNOTATED_SUB_FOLDER
        );
        FileHandler.createFolder(annotatedDir);
        await annotatedImageBuilder.buildAnnotatedImage(
            tileset,
            FileHandler.joinPaths(annotatedDir, tilesetBasename+'-annotated.png')
        );
    }

    async buildNormalizedImages(placements, refTileWidth, refTileHeight, onProgress)
    {
        let normalizedImages = [];
        for(let placement of placements){
            let placedTileset = placement.tileset;
            onProgress('Normalizing '+placedTileset.filename+'...');
            let normalized = await TilesetImageMerger.normalizeTilesetBuffer(
                placedTileset.filePath,
                placedTileset.tilesetColumns,
                placedTileset.tileRows,
                refTileWidth,
                refTileHeight,
                sc.get(placedTileset, 'margin', 0),
                sc.get(placedTileset, 'spacing', 0)
            );
            normalizedImages.push({
                buffer: normalized.buffer,
                width: normalized.width,
                height: normalized.height,
                left: placement.colOffset * refTileWidth,
                top: placement.rowOffset * refTileHeight
            });
        }
        return normalizedImages;
    }

    remapPlacements(placements)
    {
        let mergedElements = [];
        for(let placement of placements){
            for(let element of placement.tileset.elements){
                mergedElements.push(this.remapElementTiles(element, placement.rowOffset, placement.colOffset));
            }
        }
        return mergedElements.map((element, i) => Object.assign({}, element, {colorIndex: i}));
    }

    buildMergedTilesetState(props)
    {
        return {
            imageId: props.mergedName+'.png',
            imageUrl: 'output/'+props.sessionId+'/'+props.mergedName+'.png',
            filename: props.mergedName+'.png',
            filePath: props.mergedImagePath,
            imageWidth: props.imageWidth,
            imageHeight: props.imageHeight,
            tileWidth: props.refTileWidth,
            tileHeight: props.refTileHeight,
            spacing: 0,
            margin: 0,
            tilesetColumns: props.mergedColumns,
            tileRows: props.mergedRows,
            tileCount: props.mergedColumns * props.mergedRows,
            filteredTiles: [],
            bgColor: null,
            sessionId: props.sessionId,
            elements: props.mergedElements
        };
    }

    saveSessionState(configPath, sessionId, mergedFilenames, newTilesetState)
    {
        let sessionState = FileHandler.fetchFileJson(configPath) || {sessionId, tilesets: []};
        let remainingTilesets = [];
        for(let tileset of sessionState.tilesets){
            if(!mergedFilenames.has(tileset.filename)){
                remainingTilesets.push(tileset);
            }
        }
        remainingTilesets.push(newTilesetState);
        sessionState.tilesets = remainingTilesets;
        FileHandler.writeFile(configPath, sc.toJsonString(sessionState));
    }

    async writeMergeOutputFiles(outputDir, mergedName, newTilesetState)
    {
        await this.buildTilesetOutput(newTilesetState, outputDir);
        let compositeBuilder = new CompositeBuilder();
        let compositeJson = compositeBuilder.buildCompositeJSON([newTilesetState]);
        if(compositeJson){
            FileHandler.writeFile(
                FileHandler.joinPaths(outputDir, mergedName+'-composite.json'),
                MapFormatter.formatMap(compositeJson)
            );
        }
        FileHandler.writeFile(
            FileHandler.joinPaths(outputDir, mergedName+'-map-config.json'),
            sc.toJsonString({
                compositeElementsFile: mergedName+'-composite.json',
                mapsInformation: [{mapName: mergedName, mapTitle: mergedName}]
            }, null, 4)
        );
        FileHandler.writeFile(
            FileHandler.joinPaths(outputDir, mergedName+'-elements-config.json'),
            MapFormatter.formatElementsConfig([newTilesetState])
        );
    }

    async run(sessionId, tilesetsMergeData, outputDir, onProgress)
    {
        let preparator = new MergeTilesetFilter();
        onProgress('Filtering tilesets...');
        Logger.info('TilesetsMerge: filtering '+tilesetsMergeData.length+' tilesets');
        let {filteredTilesets, originalStateIndices} = preparator.filterMergeTilesets(tilesetsMergeData);
        if(2 > filteredTilesets.length){
            return {error: 'At least 2 tilesets with elements or spots required for merge'};
        }
        let resizeStrategy = sc.get(tilesetsMergeData[0], 'resizeStrategy', 'bigger');
        let {refTileWidth, refTileHeight} = preparator.resolveRefTileSize(filteredTilesets, resizeStrategy);
        let hasUnresolvableIncompatible = filteredTilesets.some(
            tileset => (tileset.tileWidth !== refTileWidth || tileset.tileHeight !== refTileHeight)
                && !tileset.autoResize
        );
        if(hasUnresolvableIncompatible){
            return {error: 'Tilesets have different tile sizes. Use "Automatically resize for merge" option.'};
        }
        onProgress('Preparing tileset files...');
        Logger.info('TilesetsMerge: preparing '+filteredTilesets.length+' tileset files');
        let mergedFilenames = new Set();
        for(let i = 0; i < filteredTilesets.length; i++){
            let filteredTileset = filteredTilesets[i];
            let prepared = await preparator.prepareFilteredTileset(
                filteredTileset,
                refTileWidth,
                outputDir,
                onProgress
            );
            if(!prepared){
                return {error: 'Failed to resize '+filteredTileset.filename};
            }
            mergedFilenames.add(filteredTileset.filename);
        }
        onProgress('Normalizing tileset images...');
        Logger.info('TilesetsMerge: normalizing '+filteredTilesets.length+' tileset images');
        for(let tileset of filteredTilesets){
            Logger.info(
                'TilesetsMerge: tileset "'+tileset.filename
                +'" grid: '+tileset.tilesetColumns+'x'+tileset.tileRows
                +', tile: '+tileset.tileWidth+'x'+tileset.tileHeight
                +', spacing: '+sc.get(tileset, 'spacing', 0)+' margin: '+sc.get(tileset, 'margin', 0)
            );
        }
        onProgress('Packing tile layout...');
        let {placements, mergedColumns, mergedRows} = TilesetImageMerger.packTilesets(filteredTilesets);
        Logger.info('TilesetsMerge: packed layout '+mergedColumns+'x'+mergedRows+' tiles');
        let normalizedImages = await this.buildNormalizedImages(placements, refTileWidth, refTileHeight, onProgress);
        let mergedName = 'merged-'+sc.getDateForFileName();
        let mergedImagePath = FileHandler.joinPaths(outputDir, mergedName+'.png');
        onProgress('Building merged image...');
        let {imageWidth, imageHeight} = await TilesetImageMerger.buildMergedImage(normalizedImages, mergedImagePath);
        Logger.info('TilesetsMerge: merged image saved '+imageWidth+'x'+imageHeight+'px → '+mergedName+'.png');
        onProgress('Remapping elements...');
        let mergedElements = this.remapPlacements(placements);
        let newTilesetState = this.buildMergedTilesetState({
            mergedName,
            mergedImagePath,
            imageWidth,
            imageHeight,
            refTileWidth,
            refTileHeight,
            mergedColumns,
            mergedRows,
            sessionId,
            mergedElements
        });
        onProgress('Building generate output...');
        Logger.info('TilesetsMerge: building generate output for merged tileset');
        await this.writeMergeOutputFiles(outputDir, mergedName, newTilesetState);
        onProgress('Saving session state...');
        Logger.info('TilesetsMerge: saving session state');
        this.saveSessionState(
            FileHandler.joinPaths(outputDir, 'session-editor-state.json'),
            sessionId,
            mergedFilenames,
            newTilesetState
        );
        Logger.info('TilesetsMerge: merged '+filteredTilesets.length+' tilesets into '+mergedName);
        return {mergedTileset: newTilesetState, stateIndices: originalStateIndices};
    }
}

module.exports.TilesetsMerge = TilesetsMerge;
