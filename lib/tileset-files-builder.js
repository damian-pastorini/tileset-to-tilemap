/**
 *
 * Reldens - TilesetFilesBuilder
 *
 */

const { ElementBuilder } = require('./element-builder');
const { CompositeBuilder } = require('./composite-builder');
const { AnnotatedImageBuilder } = require('./annotated-image-builder');
const { TilesetImagePersister } = require('./tileset-image-persister');
const { TilesetCompositeConfigBuilder } = require('./tileset-composite-config-builder');
const { ClusterCropper } = require('./cluster-cropper');
const { MapFormatter } = require('./map-formatter');
const sharp = require('sharp');
const { FileHandler } = require('@reldens/server-utils');
const { Logger, sc } = require('@reldens/utils');

class TilesetFilesBuilder
{
    constructor(options)
    {
        this.options = options || {};
        this.compositeConfigBuilder = new TilesetCompositeConfigBuilder();
    }

    collectLayerTiles(layer, tileSet, allTiles)
    {
        for(let tile of layer.tiles){
            let key = tile[0]+','+tile[1];
            if(tileSet.has(key)){
                continue;
            }
            tileSet.add(key);
            allTiles.push(tile);
        }
    }

    buildElementCluster(element)
    {
        let allTiles = [];
        let tileSet = new Set();
        for(let layer of element.layers){
            this.collectLayerTiles(layer, tileSet, allTiles);
        }
        if(!allTiles.length){
            return null;
        }
        return {
            minRow: Math.min(...allTiles.map(t => t[0])),
            maxRow: Math.max(...allTiles.map(t => t[0])),
            minCol: Math.min(...allTiles.map(t => t[1])),
            maxCol: Math.max(...allTiles.map(t => t[1])),
            tiles: allTiles
        };
    }

    storeCroppedPath(croppedElementsPaths, tilesetFilename, elementName, croppedPath)
    {
        if(!croppedPath){
            Logger.error('TilesetFilesBuilder: no cropped path for element '+elementName+' in '+tilesetFilename);
            return;
        }
        if(!croppedElementsPaths[tilesetFilename]){
            croppedElementsPaths[tilesetFilename] = {};
        }
        croppedElementsPaths[tilesetFilename][elementName] = croppedPath;
    }

    async cropElement(imageBuffer, element, tileset, croppedDir, tilesetBasename)
    {
        let cluster = this.buildElementCluster(element);
        if(!cluster){
            return null;
        }
        let croppedFilename = tilesetBasename+'-'+element.name+'.png';
        let croppedFilePath = FileHandler.joinPaths(croppedDir, croppedFilename);
        let clusterCropper = new ClusterCropper(this.options);
        let cropped = await clusterCropper.crop(
            imageBuffer,
            cluster,
            tileset.tileWidth,
            tileset.tileHeight,
            tileset.margin,
            tileset.spacing,
            sc.get(tileset, 'bgColor', null)
        );
        await sharp(cropped.buffer).toFile(croppedFilePath);
        return croppedFilePath;
    }

    async cropElementAndStorePath(imageBuffer, element, tileset, croppedDir, tilesetBasename, croppedElementsPaths)
    {
        if(!imageBuffer){
            return;
        }
        if(!croppedDir){
            return;
        }
        try {
            let croppedPath = await this.cropElement(imageBuffer, element, tileset, croppedDir, tilesetBasename);
            this.storeCroppedPath(croppedElementsPaths, tileset.filename, element.name, croppedPath);
        } catch(error) {
            Logger.error('TilesetFilesBuilder: failed to crop element '+element.name+': '+error.message);
        }
    }

    async buildSingleElementFiles(ctx, element)
    {
        let tilesetBasename = ctx.tileset.filename.replace(/\.[^.]+$/, '');
        let elementJson = ctx.elementBuilder.buildElementJSON(element, ctx.tileset);
        if(!elementJson){
            Logger.error('TilesetFilesBuilder: element '+element.name+' has no tiles, skipping');
            return [];
        }
        let elementFilename = tilesetBasename+'-'+element.name+'.json';
        FileHandler.writeFile(
            FileHandler.joinPaths(ctx.outputDir, elementFilename), MapFormatter.formatMap(elementJson)
        );
        await this.cropElementAndStorePath(
            ctx.imageBuffer,
            element,
            ctx.tileset,
            ctx.croppedDir,
            tilesetBasename,
            ctx.croppedElementsPaths
        );
        return [this.buildOutputEntry(ctx.sessionId, elementFilename)];
    }

    async buildElementFiles(sessionId, outputDir, tileset, imageBuffer, croppedDir, croppedElementsPaths)
    {
        let ctx = {
            sessionId,
            outputDir,
            tileset,
            imageBuffer,
            croppedDir,
            croppedElementsPaths,
            elementBuilder: new ElementBuilder()
        };
        let files = [];
        for(let element of tileset.elements){
            if('spot' === element.type){
                continue;
            }
            let elementFiles = await this.buildSingleElementFiles(ctx, element);
            files.push(...elementFiles);
        }
        return files;
    }

    async loadTilesetImageBuffer(tileset, outputDir, genTimestamp)
    {
        if(!tileset.filePath){
            return {imageBuffer: null, croppedDir: null};
        }
        if(!FileHandler.exists(tileset.filePath)){
            return {imageBuffer: null, croppedDir: null};
        }
        let imageBuffer = null;
        let croppedDir = null;
        try {
            imageBuffer = await sharp(tileset.filePath).png().toBuffer();
            croppedDir = FileHandler.joinPaths(outputDir, 'cropped-elements', genTimestamp);
            FileHandler.createFolder(croppedDir);
        } catch(error) {
            Logger.error('TilesetFilesBuilder: failed to load image buffer: '+error.message);
        }
        return {imageBuffer, croppedDir};
    }

    buildOutputEntry(sessionId, name)
    {
        return {name, downloadUrl: 'output/'+sessionId+'/'+name, type: 'output'};
    }

    resolveOutputFilename(filename, usedFilenames)
    {
        return this.compositeConfigBuilder.resolveOutputFilename(filename, usedFilenames);
    }

    async buildTilesetFilesEntries(sessionId, outputDir, tilesets, genTimestamp, croppedElementsPaths)
    {
        let annotatedImageBuilder = new AnnotatedImageBuilder();
        let usedFilenames = new Set();
        let files = [];
        let tilesetsBySize = {};
        for(let tileset of tilesets){
            let ext = tileset.filename.slice(tileset.filename.lastIndexOf('.'));
            let desiredFilename = tileset.mapName ? tileset.mapName+ext : tileset.filename;
            let outputFilename = this.compositeConfigBuilder.resolveOutputFilename(desiredFilename, usedFilenames);
            usedFilenames.add(outputFilename);
            if(undefined === tileset.originalFilename){
                tileset.originalFilename = tileset.filename;
            }
            tileset.filename = outputFilename;
            if(!FileHandler.copyFile(tileset.filePath, FileHandler.joinPaths(outputDir, outputFilename))){
                Logger.error('TilesetFilesBuilder: failed to copy tileset image: '+outputFilename);
            }
            files.push(this.buildOutputEntry(sessionId, outputFilename));
            let imgResult = await this.loadTilesetImageBuffer(tileset, outputDir, genTimestamp);
            let elementFiles = await this.buildElementFiles(
                sessionId,
                outputDir,
                tileset,
                imgResult.imageBuffer,
                imgResult.croppedDir,
                croppedElementsPaths
            );
            files.push(...elementFiles);
            let tilesetBasename = outputFilename.replace(/\.[^.]+$/, '');
            await annotatedImageBuilder.buildAnnotatedImage(
                tileset,
                FileHandler.joinPaths(outputDir, tilesetBasename+'-annotated.png')
            );
            files.push(this.buildOutputEntry(sessionId, tilesetBasename+'-annotated.png'));
            let sizeKey = tileset.tileWidth+'x'+tileset.tileHeight;
            if(!tilesetsBySize[sizeKey]){
                tilesetsBySize[sizeKey] = [];
            }
            tilesetsBySize[sizeKey].push(tileset);
        }
        return {files, tilesetsBySize};
    }

    buildCompositeEntries(sessionId, outputDir, tilesetsBySize, compositeOptions)
    {
        let {mapName, mapTitle, globalTileOptions, generatedFolder} = compositeOptions;
        let compositeBuilder = new CompositeBuilder();
        let sizeKeys = Object.keys(tilesetsBySize);
        let multiSize = 1 < sizeKeys.length;
        let files = [];
        for(let sizeKey of sizeKeys){
            let sizeTilesets = tilesetsBySize[sizeKey];
            let compositeFilename = multiSize ? 'composite-'+sizeKey+'.json' : 'composite.json';
            let configFilename = multiSize
                ? 'map-generator-config-'+sizeKey+'.json'
                : 'map-generator-config.json';
            let compositeJson = compositeBuilder.buildCompositeJSON(sizeTilesets, globalTileOptions);
            FileHandler.writeFile(
                FileHandler.joinPaths(outputDir, compositeFilename),
                MapFormatter.formatMap(compositeJson)
            );
            files.push(this.buildOutputEntry(sessionId, compositeFilename));
            let generatorType = this.compositeConfigBuilder.resolveGeneratorType(sizeTilesets);
            let configData = this.compositeConfigBuilder.buildConfigData(
                compositeFilename,
                generatorType,
                sizeTilesets,
                mapName,
                mapTitle,
                globalTileOptions,
                generatedFolder
            );
            FileHandler.writeFile(
                FileHandler.joinPaths(outputDir, configFilename),
                sc.toJsonString(configData, null, 4)
            );
            files.push(this.buildOutputEntry(sessionId, configFilename));
        }
        return files;
    }

    async build(rootDir, sessionId, outputDir, tilesets, fullTilesets, mapName, mapTitle, globalTileOptions)
    {
        TilesetImagePersister.persistImages(rootDir, outputDir, sessionId, fullTilesets, '', '', '');
        let configPath = FileHandler.joinPaths(outputDir, 'session-editor-state.json');
        let existingConfig = FileHandler.fetchFileJson(configPath);
        if(!existingConfig){
            existingConfig = {};
        }
        let croppedElementsPaths = sc.get(existingConfig, 'croppedElementsPaths', {});
        let genTimestamp = sc.getDateForFileName();
        let files = [this.buildOutputEntry(sessionId, 'session-editor-state.json')];
        FileHandler.writeFile(
            FileHandler.joinPaths(outputDir, 'elements-config.json'),
            MapFormatter.formatElementsConfig(tilesets)
        );
        files.push(this.buildOutputEntry(sessionId, 'elements-config.json'));
        let tilesetResult = await this.buildTilesetFilesEntries(
            sessionId,
            outputDir,
            tilesets,
            genTimestamp,
            croppedElementsPaths
        );
        files.push(...tilesetResult.files);
        let generatedFolder = FileHandler.joinPaths(rootDir, '..', 'generated');
        let compositeOptions = {mapName, mapTitle, globalTileOptions, generatedFolder};
        let compositeFiles = this.buildCompositeEntries(
            sessionId,
            outputDir,
            tilesetResult.tilesetsBySize,
            compositeOptions
        );
        files.push(...compositeFiles);
        for(let tileset of fullTilesets){
            if(!tileset.filePath){
                continue;
            }
            let filename = FileHandler.getFileName(tileset.filePath);
            files.push({
                name: filename,
                downloadUrl: 'tileset-image/'+sessionId+'/'+filename,
                type: 'input'
            });
        }
        let stateData = {sessionId, tilesets: fullTilesets, croppedElementsPaths};
        if(globalTileOptions){
            stateData.globalTileOptions = globalTileOptions;
        }
        FileHandler.writeFile(configPath, sc.toJsonString(stateData));
        return files;
    }
}

module.exports.TilesetFilesBuilder = TilesetFilesBuilder;
