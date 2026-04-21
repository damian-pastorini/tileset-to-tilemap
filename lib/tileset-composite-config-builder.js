/**
 *
 * Reldens - TilesetCompositeConfigBuilder
 *
 */

const { TilesetConst } = require('./utils/constants');
const { sc } = require('@reldens/utils');

class TilesetCompositeConfigBuilder
{

    resolveFirstProp(sizeTilesets, key, fallback)
    {
        for(let tileset of sizeTilesets){
            let value = sc.get(tileset, key, null);
            if(value){
                return value;
            }
        }
        return fallback;
    }

    resolveGeneratorType(sizeTilesets)
    {
        return this.resolveFirstProp(sizeTilesets, 'generatorType', TilesetConst.GENERATOR_TYPES.COMPOSITE);
    }

    buildGroundSpotConfig(spot)
    {
        let layerName = sc.get(spot, 'layerName', 'ground-spot-' + spot.name);
        return {
            layerName,
            tilesKey: spot.name,
            width: sc.get(spot, 'width', null),
            height: sc.get(spot, 'height', null),
            quantity: sc.get(spot, 'quantity', null),
            freeSpaceAround: sc.get(spot, 'freeSpaceAround', null),
            walkable: sc.get(spot, 'walkable', false),
            isElement: sc.get(spot, 'isElement', false),
            allowPathsInFreeSpace: sc.get(spot, 'allowPathsInFreeSpace', false),
            variableTilesPercentage: sc.get(spot, 'variableTilesPercentage', 0)
        };
    }

    mergeTilesetSpots(spots, groundSpots)
    {
        for(let spot of spots){
            if(spot.name){
                groundSpots[spot.name] = this.buildGroundSpotConfig(spot);
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
        globalTileOptions
    ){
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
        let tileOptions = this.resolveFirstProp(sizeTilesets, 'tileOptions', null);
        if(!tileOptions && globalTileOptions){
            tileOptions = globalTileOptions;
        }
        if(tileOptions){
            config.tileOptions = tileOptions;
        }
        if(globalTileOptions){
            config.globalTileOptions = globalTileOptions;
        }
        if(Object.keys(tilesetData.groundSpots).length){
            config.groundSpots = tilesetData.groundSpots;
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
