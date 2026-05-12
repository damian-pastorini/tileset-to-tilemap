/**
 *
 * Reldens - TilesetCompositeConfigBuilder
 *
 */

const { TilesetConst } = require('./utils/constants');
const { TileOptionsMerger } = require('./tile-options-merger');
const { sc } = require('@reldens/utils');

class TilesetCompositeConfigBuilder
{

    constructor()
    {
        this.tileOptionsMerger = new TileOptionsMerger();
    }

    computeFirstgids(sizeTilesets)
    {
        let firstgids = [];
        let firstgid = 1;
        for(let tileset of sizeTilesets){
            firstgids.push(firstgid);
            firstgid += tileset.tileCount;
        }
        return firstgids;
    }

    findFirstInTilesets(sizeTilesets, extractFn)
    {
        for(let tileset of sizeTilesets){
            let value = extractFn(tileset);
            if(null !== value && undefined !== value){
                return value;
            }
        }
        return null;
    }

    resolveFirstProp(sizeTilesets, key, fallback)
    {
        return this.findFirstInTilesets(sizeTilesets, (t) => sc.get(t, key, null) || null) || fallback;
    }

    resolveGeneratorType(sizeTilesets)
    {
        return this.resolveFirstProp(sizeTilesets, 'generatorType', TilesetConst.GENERATOR_TYPES.COMPOSITE);
    }

    normalizeSpotKey(spotName)
    {
        if(!spotName){
            return '';
        }
        return spotName.replace(/-/g, '_');
    }

    buildGroundSpotConfig(spot)
    {
        let normalizedKey = this.normalizeSpotKey(spot.name);
        let layerName = normalizedKey;
        let spotQuantity = sc.get(spot, 'quantity', null);
        let spotTile = sc.get(spot, 'spotTile', null);
        let surroundingTiles = sc.get(spot, 'surroundingTiles', {});
        let rawWidth = sc.get(spot, 'width', null);
        let rawHeight = sc.get(spot, 'height', null);
        let borderOuterWalls = sc.get(spot, 'borderOuterWalls', false);
        let borderInnerWalls = sc.get(spot, 'borderInnerWalls', false);
        let isElement = sc.get(spot, 'isElement', true);
        let config = {
            layerName,
            tilesKey: normalizedKey,
            width: (null !== rawWidth && 0 < rawWidth) ? rawWidth : 5,
            height: (null !== rawHeight && 0 < rawHeight) ? rawHeight : 5,
            quantity: (null !== spotQuantity && undefined !== spotQuantity) ? spotQuantity : 1,
            freeSpaceAround: sc.get(spot, 'freeSpaceAround', 1),
            walkable: sc.get(spot, 'walkable', false),
            isElement,
            allowPathsInFreeSpace: sc.get(spot, 'allowPathsInFreeSpace', false),
            variableTilesPercentage: sc.get(spot, 'variableTilesPercentage', 0),
            markPercentage: sc.get(spot, 'markPercentage', 100),
            applyCornersTiles: 0 < Object.keys(surroundingTiles).length,
            splitBordersInLayers: sc.get(spot, 'splitBordersInLayers', false) || borderOuterWalls || borderInnerWalls,
            placeRandomPath: sc.get(spot, 'placeRandomPath', false),
            depth: sc.get(spot, 'depth', true),
            mapCentered: sc.get(spot, 'mapCentered', 0),
            borderOuterWalls,
            borderInnerWalls: borderInnerWalls || borderOuterWalls,
            borderOuterWallsIncreaseLayerSize: sc.get(spot, 'borderOuterWallsIncreaseLayerSize', 4)
        };
        if(null !== spotTile){
            config.spotTile = 0;
        }
        return config;
    }

    applyFirstgidToList(values, firstgid)
    {
        let result = [];
        for(let value of values){
            result.push(firstgid + value);
        }
        return result;
    }

    mergeTilesetSpots(spots, groundSpots)
    {
        for(let spot of spots){
            if(spot.name){
                groundSpots[this.normalizeSpotKey(spot.name)] = this.buildGroundSpotConfig(spot);
            }
        }
    }

    buildTilesetData(sizeTilesets, fallbackMapName, fallbackMapTitle)
    {
        let mapsInformation = [];
        let groundSpots = {};
        for(let tileset of sizeTilesets){
            let mapName = sc.get(tileset, 'mapName', fallbackMapName);
            let mapTitle = sc.get(tileset, 'mapTitle', fallbackMapTitle);
            mapsInformation.push({mapName, mapTitle});
            this.mergeTilesetSpots(sc.get(tileset, 'spots', []), groundSpots);
        }
        return {mapsInformation, groundSpots};
    }

    buildConfigData(
        compositeFilename,
        generatorType,
        sizeTilesets,
        fallbackMapName,
        fallbackMapTitle,
        globalTileOptions,
        generatedFolder
    ){
        let firstgids = this.computeFirstgids(sizeTilesets);
        let tilesetData = this.buildTilesetData(sizeTilesets, fallbackMapName, fallbackMapTitle);
        let config = {
            generatorType,
            compositeElementsFile: compositeFilename,
            mapsInformation: tilesetData.mapsInformation
        };
        if(TilesetConst.GENERATOR_TYPES.MULTIPLE_ASSOC === generatorType){
            let assocProps = sc.get(sizeTilesets[0], 'associationsProperties', null);
            if(assocProps){
                config.associationsProperties = assocProps;
            }
        }
        let tileOptions = this.tileOptionsMerger.merge(sizeTilesets, globalTileOptions, firstgids);
        if(tileOptions){
            config.tileOptions = tileOptions;
        }
        if(Object.keys(tilesetData.groundSpots).length){
            config.groundSpots = tilesetData.groundSpots;
        }
        if(generatedFolder){
            config.generatedFolder = generatedFolder;
        }
        return config;
    }

    resolveOutputFilename(filename, usedFilenames)
    {
        if(!usedFilenames.has(filename)){
            return filename;
        }
        let base = filename.replace(/\.[^.]+$/, '');
        let ext = filename.slice(base.length);
        for(let letter of 'abcdefghijklmnopqrstuvwxyz'){
            let candidate = base+'-'+letter+ext;
            if(!usedFilenames.has(candidate)){
                return candidate;
            }
        }
        return base+'-'+Date.now()+ext;
    }
}

module.exports.TilesetCompositeConfigBuilder = TilesetCompositeConfigBuilder;
