/**
 *
 * Reldens - CompositeCanvasSizer
 *
 */

const { CompositeTileAnnotationBuilder } = require('./composite-tile-annotation-builder');

class CompositeCanvasSizer
{

    maxSpotVariationLength(spots)
    {
        let max = 0;
        for(let spot of spots){
            if(spot.spotTileVariations && spot.spotTileVariations.length > max){
                max = spot.spotTileVariations.length;
            }
        }
        return max;
    }

    maxVariationLengthForTileset(tileset, effectiveOpts, annotationBuilder)
    {
        let spots = tileset.spots ? tileset.spots : [];
        let max = 0;
        if(effectiveOpts && effectiveOpts.randomGroundTiles){
            max = effectiveOpts.randomGroundTiles.length;
        }
        let annotatedIds = annotationBuilder.collectAnnotatedFlatIds(effectiveOpts, spots);
        if(annotatedIds.length > max){
            max = annotatedIds.length;
        }
        let spotMax = this.maxSpotVariationLength(spots);
        if(spotMax > max){
            max = spotMax;
        }
        return max;
    }

    calculateMaxVariationLength(tilesets, effectivePerTileset)
    {
        let annotationBuilder = new CompositeTileAnnotationBuilder();
        let max = 0;
        for(let ti = 0; ti < tilesets.length; ti++){
            let effectiveOpts = effectivePerTileset ? effectivePerTileset[ti] : null;
            let count = this.maxVariationLengthForTileset(tilesets[ti], effectiveOpts, annotationBuilder);
            if(count > max){
                max = count;
            }
        }
        return max;
    }

    expandCanvasForVariations(layout, tilesets, effectivePerTileset)
    {
        let maxVarLength = this.calculateMaxVariationLength(tilesets, effectivePerTileset);
        if(layout.canvasWidth * layout.canvasHeight >= maxVarLength){
            return;
        }
        layout.canvasHeight = Math.ceil(maxVarLength / layout.canvasWidth);
    }

}

module.exports.CompositeCanvasSizer = CompositeCanvasSizer;
