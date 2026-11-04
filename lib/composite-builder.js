/**
 *
 * Reldens - CompositeBuilder
 *
 */

const { ElementBuilder } = require('./element-builder');
const { CompositeTileAnnotationBuilder } = require('./composite-tile-annotation-builder');
const { CompositeAnnotationResolver } = require('./composite-annotation-resolver');
const { CompositeCanvasSizer } = require('./composite-canvas-sizer');
const { CompositeWangsetBuilder } = require('./composite-wangset-builder');
const { Logger } = require('@reldens/utils');

class CompositeBuilder
{

    buildCompositeJSON(tilesets, globalTileOptions)
    {
        if(!tilesets || !tilesets.length){
            Logger.error('CompositeBuilder: no tilesets provided');
            return false;
        }
        let elementBuilder = new ElementBuilder();
        let annotationResolver = new CompositeAnnotationResolver();
        let effectivePerTileset = annotationResolver.resolve(tilesets, globalTileOptions);
        let processed = this.preprocessTilesets(tilesets, elementBuilder, effectivePerTileset);
        let pathTileCompositeId = annotationResolver.resolvePathTileCompositeId(effectivePerTileset, processed.tilesetFirstgids);
        let layout = this.packElements(processed.elements, processed.totalArea, processed.maxElemWidth);
        new CompositeCanvasSizer().expandCanvasForVariations(layout, tilesets, effectivePerTileset);
        let layers = this.buildLayers(layout.placements, layout.canvasWidth, layout.canvasHeight, pathTileCompositeId);
        let varLayers = this.buildVariationLayers(
            tilesets,
            processed.tilesetFirstgids,
            layout.canvasWidth,
            layout.canvasHeight,
            layers.length + 1,
            effectivePerTileset
        );
        layers.push(...varLayers);
        return {
            compressionlevel: -1,
            height: layout.canvasHeight,
            infinite: false,
            layers,
            nextlayerid: layers.length + 1,
            nextobjectid: 1,
            orientation: 'orthogonal',
            renderorder: 'right-down',
            tileheight: tilesets[0].tileHeight,
            tilesets: processed.tilesetEntries,
            tilewidth: tilesets[0].tileWidth,
            type: 'map',
            width: layout.canvasWidth
        };
    }

    preprocessTilesets(tilesets, elementBuilder, effectivePerTileset)
    {
        let tilesetEntries = [];
        let allElements = [];
        let tilesetFirstgids = [];
        let totalArea = 0;
        let maxElemWidth = 0;
        let firstgid = 1;
        for(let ti = 0; ti < tilesets.length; ti++){
            let tileset = tilesets[ti];
            tilesetFirstgids.push(firstgid);
            let effectiveTileOptions = effectivePerTileset ? effectivePerTileset[ti] : null;
            tilesetEntries.push(this.createTilesetEntry(tileset, firstgid, effectiveTileOptions));
            let collected = this.collectTilesetElements(tileset, elementBuilder, firstgid, allElements);
            totalArea += collected.totalAreaDelta;
            if(collected.maxElemWidth > maxElemWidth){
                maxElemWidth = collected.maxElemWidth;
            }
            firstgid += tileset.tileCount;
        }
        return {tilesetEntries, elements: allElements, totalArea, maxElemWidth, tilesetFirstgids};
    }

    collectTilesetElements(tileset, elementBuilder, firstgid, allElements)
    {
        let totalAreaDelta = 0;
        let maxElemWidth = 0;
        for(let element of tileset.elements){
            let bounds = elementBuilder.getElementBounds(element);
            if(!Number.isFinite(bounds.minRow)){
                continue;
            }
            let w = bounds.maxCol - bounds.minCol + 1;
            let h = bounds.maxRow - bounds.minRow + 1;
            totalAreaDelta += (w + 1) * (h + 1);
            if(w > maxElemWidth){
                maxElemWidth = w;
            }
            allElements.push({
                element,
                minRow: bounds.minRow,
                minCol: bounds.minCol,
                w,
                h,
                firstgid,
                tilesetColumns: tileset.tilesetColumns
            });
        }
        return { totalAreaDelta, maxElemWidth };
    }

    createTilesetEntry(tileset, firstgid, effectiveTileOptions)
    {
        let entry = {
            columns: tileset.tilesetColumns,
            firstgid,
            image: tileset.filename,
            imageheight: tileset.imageHeight,
            imagewidth: tileset.imageWidth,
            margin: tileset.margin,
            name: tileset.filename.replace('.png', ''),
            spacing: tileset.spacing,
            tilecount: tileset.tileCount,
            tileheight: tileset.tileHeight,
            tilewidth: tileset.tileWidth
        };
        let annotationBuilder = new CompositeTileAnnotationBuilder();
        let annotations = annotationBuilder.buildTileAnnotations(effectiveTileOptions || null, tileset.spots, tileset);
        if(annotations.length){
            entry.tiles = annotations;
        }
        let wangsetBuilder = new CompositeWangsetBuilder();
        let wangsets = wangsetBuilder.buildSpotWangsets(tileset.spots || []);
        let mapBorderWallsWangset = wangsetBuilder.buildMapBorderWallsWangset(effectiveTileOptions);
        if(mapBorderWallsWangset){
            wangsets.push(mapBorderWallsWangset);
        }
        if(wangsets.length){
            entry.wangsets = wangsets;
        }
        return entry;
    }

    packElements(elements, totalArea, maxElemWidth)
    {
        let approxSide = Math.ceil(Math.sqrt(totalArea));
        let canvasWidth = Math.max(approxSide + 2, maxElemWidth + 2);
        let canvasCol = 1;
        let canvasRow = 1;
        let maxRowHeight = 0;
        let maxUsedCol = 0;
        let placements = [];
        for(let elData of elements){
            if(canvasCol > 1 && canvasCol + elData.w > canvasWidth - 1){
                canvasRow += maxRowHeight + 1;
                canvasCol = 1;
                maxRowHeight = 0;
            }
            placements.push({
                element: elData.element,
                minRow: elData.minRow,
                minCol: elData.minCol,
                elemCanvasRow: canvasRow,
                elemCanvasCol: canvasCol,
                firstgid: elData.firstgid,
                tilesetColumns: elData.tilesetColumns
            });
            let rightEdge = canvasCol + elData.w - 1;
            if(rightEdge > maxUsedCol){
                maxUsedCol = rightEdge;
            }
            canvasCol += elData.w + 1;
            if(elData.h > maxRowHeight){
                maxRowHeight = elData.h;
            }
        }
        canvasWidth = maxUsedCol + 2;
        let canvasHeight = canvasRow + maxRowHeight + 1;
        if(!canvasHeight){
            canvasHeight = 1;
        }
        return {canvasWidth, canvasHeight, placements};
    }

    buildLayers(placements, canvasWidth, canvasHeight, pathTileCompositeId)
    {
        let layers = [];
        let layerId = 1;
        for(let placement of placements){
            let result = this.buildElementLayers(placement, canvasWidth, canvasHeight, layerId, pathTileCompositeId);
            layers.push(...result.layers);
            layerId = result.layerId;
        }
        return layers;
    }

    buildElementLayers(placement, canvasWidth, canvasHeight, layerId, pathTileCompositeId)
    {
        let layers = [];
        let element = placement.element;
        for(let layerIndex = 0; layerIndex < element.layers.length; layerIndex++){
            let layer = element.layers[layerIndex];
            let data = new Array(canvasWidth * canvasHeight).fill(0);
            this.fillLayerData(data, layer.tiles, placement, canvasWidth);
            if('path' === layer.type && null !== pathTileCompositeId && undefined !== pathTileCompositeId){
                this.replacePathLayerTiles(data, pathTileCompositeId);
            }
            let layerObj = this.buildVariationLayer(element.name+'-'+layer.type, data, canvasWidth, canvasHeight, layerId);
            if(0 === layerIndex){
                layerObj.properties = [
                    { name: 'quantity', type: 'int', value: element.quantity },
                    { name: 'freeSpaceAround', type: 'int', value: element.freeSpaceAround },
                    { name: 'allowPathsInFreeSpace', type: 'bool', value: element.layers.some(l => 'path' === l.type) || element.allowPathsInFreeSpace }
                ];
                let mapCentered = Number(element.mapCentered) || 0;
                if(0 < mapCentered){
                    layerObj.properties.push({ name: 'mapCentered', type: 'int', value: mapCentered });
                }
            }
            layers.push(layerObj);
            layerId++;
        }
        return {layers, layerId};
    }

    replacePathLayerTiles(data, pathTileCompositeId)
    {
        for(let i = 0; i < data.length; i++){
            if(0 !== data[i]){
                data[i] = pathTileCompositeId;
            }
        }
    }

    fillLayerData(data, tiles, placement, canvasWidth)
    {
        for(let tile of tiles){
            let r = tile[0];
            let c = tile[1];
            let canvasIndex = (placement.elemCanvasRow + r - placement.minRow) * canvasWidth
                + (placement.elemCanvasCol + c - placement.minCol);
            data[canvasIndex] = placement.firstgid + r * placement.tilesetColumns + c;
        }
    }

    buildVariationLayers(tilesets, tilesetFirstgids, canvasWidth, canvasHeight, startLayerId, effectivePerTileset)
    {
        let layers = [];
        let layerId = startLayerId;
        let canvasSize = canvasWidth * canvasHeight;
        let annotationBuilder = new CompositeTileAnnotationBuilder();
        for(let ti = 0; ti < tilesets.length; ti++){
            let tileset = tilesets[ti];
            let firstgid = tilesetFirstgids[ti];
            let effectiveOpts = effectivePerTileset ? effectivePerTileset[ti] : null;
            let randomTiles = effectiveOpts && effectiveOpts.randomGroundTiles && effectiveOpts.randomGroundTiles.length
                ? effectiveOpts.randomGroundTiles
                : [];
            if(randomTiles.length){
                let data = this.buildVariationData(randomTiles, firstgid, canvasSize);
                layers.push(this.buildVariationLayer('ground-variations', data, canvasWidth, canvasHeight, layerId));
                layerId++;
            }
            let annotatedIds = annotationBuilder.collectAnnotatedFlatIds(
                effectiveOpts,
                tileset.spots ? tileset.spots : []
            );
            if(annotatedIds.length){
                let refData = this.buildVariationData(annotatedIds, firstgid, canvasWidth * canvasHeight);
                layers.push(this.buildVariationLayer('tileset-ref', refData, canvasWidth, canvasHeight, layerId));
                layerId++;
            }
            let spotResult = this.collectSpotVariationLayers(
                tileset.spots ? tileset.spots : [],
                firstgid,
                canvasWidth,
                canvasHeight,
                layerId,
                canvasSize
            );
            layers.push(...spotResult.layers);
            layerId = spotResult.layerId;
        }
        return layers;
    }

    collectSpotVariationLayers(spots, firstgid, canvasWidth, canvasHeight, startLayerId, canvasSize)
    {
        let layers = [];
        let layerId = startLayerId;
        for(let spot of spots){
            if(!spot.name){
                continue;
            }
            if(!spot.spotTileVariations || !spot.spotTileVariations.length){
                continue;
            }
            layers.push(this.buildVariationLayer(
                'spot-layer-ground-variations-'+spot.name.replace(/-/g, '_'),
                this.buildVariationData(spot.spotTileVariations, firstgid, canvasSize),
                canvasWidth,
                canvasHeight,
                layerId
            ));
            layerId++;
        }
        return { layers, layerId };
    }

    buildVariationData(tileIds, firstgid, canvasSize)
    {
        let data = new Array(canvasSize).fill(0);
        for(let vi = 0; vi < tileIds.length && vi < canvasSize; vi++){
            data[vi] = firstgid + tileIds[vi];
        }
        return data;
    }

    buildVariationLayer(name, data, canvasWidth, canvasHeight, layerId)
    {
        return {
            data,
            height: canvasHeight,
            id: layerId,
            name,
            opacity: 1,
            type: 'tilelayer',
            visible: true,
            width: canvasWidth,
            x: 0,
            y: 0
        };
    }
}

module.exports.CompositeBuilder = CompositeBuilder;
