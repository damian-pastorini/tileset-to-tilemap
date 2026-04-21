/**
 *
 * Reldens - MapsWizardConfigBuilder
 *
 */

const { TilesetConst } = require('./utils/constants');
const { sc } = require('@reldens/utils');

class MapsWizardConfigBuilder
{

    applyTileOptions(partialData, tileOptions)
    {
        let keys = [
            'groundTile',
            'pathTile',
            'borderTile',
            'randomGroundTiles',
            'surroundingTiles',
            'corners',
            'bordersTiles',
            'borderCornersTiles'
        ];
        for(let key of keys){
            if(null !== tileOptions[key] && undefined !== tileOptions[key]){
                partialData[key] = tileOptions[key];
            }
        }
    }

    buildPartialGeneratorData(config)
    {
        let strategy = sc.get(config, 'generatorType', TilesetConst.GENERATOR_TYPES.COMPOSITE);
        let compositeElementsFile = sc.get(config, 'compositeElementsFile', '');
        let partialData = {compositeElementsFile, automaticallyExtrudeMaps: 1};
        if(TilesetConst.GENERATOR_TYPES.MULTIPLE === strategy){
            let mapsInformation = sc.get(config, 'mapsInformation', []);
            partialData.mapNames = mapsInformation.map(m => m.mapName);
        }
        if(TilesetConst.GENERATOR_TYPES.MULTIPLE_ASSOC === strategy){
            partialData.mapsInformation = sc.get(config, 'mapsInformation', []);
            let assocProps = sc.get(config, 'associationsProperties', null);
            if(assocProps){
                partialData.associationsProperties = assocProps;
            }
        }
        let tileOptions = sc.get(config, 'tileOptions', null);
        if(tileOptions){
            this.applyTileOptions(partialData, tileOptions);
        }
        let groundSpots = sc.get(config, 'groundSpots', null);
        if(groundSpots){
            partialData.groundSpots = groundSpots;
        }
        return {strategy, partialData};
    }

}

module.exports.MapsWizardConfigBuilder = MapsWizardConfigBuilder;
