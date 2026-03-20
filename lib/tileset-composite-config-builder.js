/**
 *
 * Reldens - TilesetCompositeConfigBuilder
 *
 */

const { TilesetConst } = require('./utils/constants');
const { sc } = require('@reldens/utils');

class TilesetCompositeConfigBuilder
{
    resolveGeneratorType(sizeTilesets)
    {
        for(let tileset of sizeTilesets){
            let type = sc.get(tileset, 'generatorType', '');
            if(type){
                return type;
            }
        }
        return TilesetConst.GENERATOR_TYPES.COMPOSITE;
    }

    buildMapsInformation(sizeTilesets, fallbackMapName, fallbackMapTitle)
    {
        let result = [];
        for(let tileset of sizeTilesets){
            let mapName = sc.get(tileset, 'mapName', fallbackMapName);
            let mapTitle = sc.get(tileset, 'mapTitle', fallbackMapTitle);
            result.push({mapName, mapTitle});
        }
        return result;
    }

    buildConfigData(compositeFilename, generatorType, sizeTilesets, fallbackMapName, fallbackMapTitle)
    {
        let mapsInformation = this.buildMapsInformation(sizeTilesets, fallbackMapName, fallbackMapTitle);
        let config = {generatorType, compositeElementsFile: compositeFilename, mapsInformation};
        if(TilesetConst.GENERATOR_TYPES.MULTIPLE_ASSOC === generatorType){
            let assocProps = sc.get(sizeTilesets[0], 'associationsProperties', null);
            if(assocProps){
                config.associationsProperties = assocProps;
            }
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
