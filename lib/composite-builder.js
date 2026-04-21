/**
 *
 * Reldens - CompositeBuilder
 *
 */

const { ElementBuilder } = require('./element-builder');
const { Logger } = require('@reldens/utils');

class CompositeBuilder
{

    buildCompositeJSON(tilesets)
    {
        if(!tilesets || !tilesets.length){
            Logger.error('CompositeBuilder: no tilesets provided');
            return false;
        }
        let elementBuilder = new ElementBuilder();
        let processed = this.preprocessTilesets(tilesets, elementBuilder);
        let layout = this.packElements(processed.elements, processed.totalArea, processed.maxElemWidth);
        let layers = this.buildLayers(layout.placements, layout.canvasWidth, layout.canvasHeight);
        let varLayers = this.buildVariationLayers(
            tilesets,
            processed.tilesetFirstgids,
            layout.canvasWidth,
            layout.canvasHeight,
            layers.length + 1
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

    preprocessTilesets(tilesets, elementBuilder)
    {
        let tilesetEntries = [];
        let allElements = [];
        let tilesetFirstgids = [];
        let totalArea = 0;
        let maxElemWidth = 0;
        let firstgid = 1;
        for(let tileset of tilesets){
            tilesetFirstgids.push(firstgid);
            tilesetEntries.push(this.createTilesetEntry(tileset, firstgid));
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

    createTilesetEntry(tileset, firstgid)
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
        let tileAnnotations = this.buildTileAnnotations(tileset.tileOptions, tileset.spots);
        if(tileAnnotations.length){
            entry.tiles = tileAnnotations;
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

    buildLayers(placements, canvasWidth, canvasHeight)
    {
        let layers = [];
        let layerId = 1;
        for(let placement of placements){
            let result = this.buildElementLayers(placement, canvasWidth, canvasHeight, layerId);
            layers.push(...result.layers);
            layerId = result.layerId;
        }
        return layers;
    }

    buildElementLayers(placement, canvasWidth, canvasHeight, layerId)
    {
        let layers = [];
        let element = placement.element;
        for(let layerIndex = 0; layerIndex < element.layers.length; layerIndex++){
            let layer = element.layers[layerIndex];
            let data = new Array(canvasWidth * canvasHeight).fill(0);
            this.fillLayerData(data, layer.tiles, placement, canvasWidth);
            let layerObj = {
                data,
                height: canvasHeight,
                id: layerId,
                name: element.name+'-'+layer.type,
                opacity: 1,
                type: 'tilelayer',
                visible: true,
                width: canvasWidth,
                x: 0,
                y: 0
            };
            if(0 === layerIndex){
                layerObj.properties = [
                    { name: 'quantity', type: 'int', value: element.quantity },
                    { name: 'freeSpaceAround', type: 'int', value: element.freeSpaceAround },
                    { name: 'allowPathsInFreeSpace', type: 'bool', value: element.allowPathsInFreeSpace }
                ];
            }
            layers.push(layerObj);
            layerId++;
        }
        return {layers, layerId};
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

    buildTileAnnotations(tileOptions, spots)
    {
        let tiles = [];
        let opts = tileOptions ? tileOptions : {};
        this.addSimpleAnnotation(tiles, opts.groundTile, 'groundTile');
        this.addSimpleAnnotation(tiles, opts.pathTile, 'pathTile');
        this.addPositionalAnnotations(tiles, opts.surroundingTiles, '');
        this.addPositionalAnnotations(tiles, opts.corners, 'corner-');
        this.addPositionalAnnotations(tiles, opts.bordersTiles, 'border-');
        for(let spot of (spots ? spots : [])){
            if(!spot.name){
                continue;
            }
            this.addSpotAnnotations(tiles, spot);
        }
        return tiles;
    }

    addSimpleAnnotation(tiles, flatIndex, keyValue)
    {
        if(null === flatIndex || undefined === flatIndex){
            return;
        }
        tiles.push({ id: flatIndex, properties: [{ name: 'key', type: 'string', value: keyValue }] });
    }

    addPositionalAnnotations(tiles, posObj, prefix)
    {
        if(!posObj){
            return;
        }
        let positions = Object.keys(posObj);
        for(let pos of positions){
            let fi = posObj[pos];
            if(null === fi || undefined === fi){
                continue;
            }
            tiles.push({ id: fi, properties: [{ name: 'key', type: 'string', value: prefix + pos }] });
        }
    }

    addSpotAnnotations(tiles, spot)
    {
        if(null !== spot.spotTile && undefined !== spot.spotTile){
            tiles.push({ id: spot.spotTile, properties: [
                { name: 'groundSpots', type: 'string', value: spot.name },
                { name: 'key', type: 'string', value: 'groundTile' }
            ]});
        }
        this.addPositionalAnnotations(tiles, spot.surroundingTiles, spot.name + '-');
        this.addPositionalAnnotations(tiles, spot.corners, spot.name + '-corner-');
    }

    buildVariationLayers(tilesets, tilesetFirstgids, canvasWidth, canvasHeight, startLayerId)
    {
        let layers = [];
        let layerId = startLayerId;
        let canvasSize = canvasWidth * canvasHeight;
        for(let ti = 0; ti < tilesets.length; ti++){
            let tileset = tilesets[ti];
            let firstgid = tilesetFirstgids[ti];
            let opts = tileset.tileOptions ? tileset.tileOptions : {};
            if(opts.randomGroundTiles && opts.randomGroundTiles.length){
                let data = this.buildVariationData(opts.randomGroundTiles, firstgid, canvasSize);
                layers.push(this.buildVariationLayer('ground-variations', data, canvasWidth, canvasHeight, layerId));
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
            if(!spot.name || !spot.spotTileVariations || !spot.spotTileVariations.length){
                continue;
            }
            layers.push(this.buildVariationLayer(
                'spot-layer-ground-variations-' + spot.name,
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
