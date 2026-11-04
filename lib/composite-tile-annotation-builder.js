/**
 *
 * Reldens - CompositeTileAnnotationBuilder
 *
 */

const { TileAnimationsBuilder } = require('./tile-animations-builder');
const { TilesetConst } = require('./constants');
const { sc } = require('@reldens/utils');

class CompositeTileAnnotationBuilder
{

    constructor()
    {
        this.surroundingPositionToName = TilesetConst.SPOT_SURROUNDING_POSITION_TO_NAME;
        this.cornerPositionToName = TilesetConst.SPOT_CORNER_POSITION_TO_NAME;
        this.borderSideToSurroundingName = TilesetConst.SPOT_BORDER_SIDE_TO_SURROUNDING_NAME;
        this.tileAnimationsBuilder = new TileAnimationsBuilder();
    }

    normalizeSpotKey(spotName)
    {
        if(!spotName){
            return '';
        }
        return spotName.replace(/-/g, '_');
    }

    buildTileAnnotations(tileOptions, spots, tileset)
    {
        let animatedTilesUsedIds = this.collectAnnotatedFlatIds(tileOptions, spots);
        this.appendVariationFlatIds(animatedTilesUsedIds, tileOptions, spots);
        let animationEntries = this.tileAnimationsBuilder.build(tileset, animatedTilesUsedIds);
        let tiles = [];
        let surroundingTiles = sc.get(tileOptions, 'surroundingTiles', {});
        let corners = sc.get(tileOptions, 'corners', {});
        this.addSimpleAnnotation(tiles, sc.get(tileOptions, 'groundTile', null), 'groundTile');
        this.addGroundTilesAnnotations(tiles, sc.get(tileOptions, 'groundTiles', []));
        this.addSimpleAnnotation(tiles, sc.get(tileOptions, 'pathTile', null), 'pathTile');
        this.addPositionalAnnotations(tiles, surroundingTiles, '', this.surroundingPositionToName);
        this.addPositionalAnnotations(tiles, corners, 'corner-', this.cornerPositionToName);
        let bordersTiles = this.resolveBordersTiles(tileOptions);
        this.addPositionalAnnotations(tiles, bordersTiles, 'border-', null);
        this.addPositionalAnnotations(
            tiles,
            sc.get(tileOptions, 'borderInnerCornersTiles', {}),
            'border-inner-corner-',
            null
        );
        for(let spot of (spots ? spots : [])){
            if(!spot.name){
                continue;
            }
            this.addSpotAnnotations(tiles, spot);
        }
        return this.mergeDuplicateTileAnnotations(tiles, animationEntries);
    }

    copyPropertiesIntoEntry(entry, properties)
    {
        for(let prop of properties){
            entry.properties.push(prop);
        }
    }

    mergeDuplicateTileAnnotations(tiles, animationEntries)
    {
        let byId = {};
        let order = [];
        for(let tile of tiles){
            if(!sc.hasOwn(byId, tile.id)){
                byId[tile.id] = { id: tile.id, properties: [] };
                order.push(tile.id);
            }
            this.copyPropertiesIntoEntry(byId[tile.id], tile.properties);
        }
        this.copyAnimationsIntoEntries(byId, order, animationEntries);
        let merged = [];
        for(let id of order){
            merged.push(this.cleanEmptyProperties(byId[id]));
        }
        return merged;
    }

    copyAnimationsIntoEntries(byId, order, animationEntries)
    {
        for(let animationEntry of (animationEntries ? animationEntries : [])){
            if(!byId[animationEntry.id]){
                byId[animationEntry.id] = { id: animationEntry.id, properties: [] };
                order.push(animationEntry.id);
            }
            byId[animationEntry.id].animation = animationEntry.animation;
        }
    }

    cleanEmptyProperties(entry)
    {
        if(0 < entry.properties.length){
            return entry;
        }
        delete entry.properties;
        return entry;
    }

    resolveBorderSidesTiles(tileOptions)
    {
        let bordersTiles = sc.get(tileOptions, 'bordersTiles', {});
        if(0 < Object.keys(bordersTiles).length){
            return bordersTiles;
        }
        let borderTile = sc.get(tileOptions, 'borderTile', null);
        if(null === borderTile){
            return null;
        }
        return {
            top: borderTile,
            right: borderTile,
            bottom: borderTile,
            left: borderTile
        };
    }

    resolveBordersTiles(tileOptions)
    {
        let borderSidesTiles = this.resolveBorderSidesTiles(tileOptions);
        let borderCornersTiles = sc.get(tileOptions, 'borderCornersTiles', {});
        if(0 === Object.keys(borderCornersTiles).length){
            return borderSidesTiles;
        }
        return Object.assign({}, borderSidesTiles, borderCornersTiles);
    }

    iteratePositions(posObj, callback)
    {
        if(!posObj){
            return;
        }
        let positions = Object.keys(posObj);
        for(let pos of positions){
            let fi = sc.get(posObj, pos, null);
            if(null === fi){
                continue;
            }
            callback(pos, fi);
        }
    }

    addSimpleAnnotation(tiles, flatIndex, keyValue)
    {
        if(null === flatIndex || 'undefined' === typeof flatIndex){
            return;
        }
        tiles.push({ id: flatIndex, properties: [{ name: 'key', type: 'string', value: keyValue }] });
    }

    addGroundTilesAnnotations(tiles, groundTiles)
    {
        for(let flatIndex of (groundTiles ? groundTiles : [])){
            this.addSimpleAnnotation(tiles, flatIndex, 'groundTile');
        }
    }

    addPositionalAnnotations(tiles, posObj, prefix, positionToName)
    {
        this.iteratePositions(posObj, (pos, fi) => {
            let positionKey = positionToName ? positionToName[pos] : pos;
            if(!positionKey){
                return;
            }
            tiles.push({ id: fi, properties: [{ name: 'key', type: 'string', value: prefix+positionKey }] });
        });
    }

    addSyntheticCornerAnnotations(tiles, spotTile, normalizedKey)
    {
        let cornerNames = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
        for(let cornerName of cornerNames){
            tiles.push({ id: spotTile, properties: [
                { name: 'key', type: 'string', value: normalizedKey+'-corner-'+cornerName }
            ]});
        }
    }

    collectUsedSurroundingNames(spot)
    {
        let usedNames = {};
        this.iteratePositions(sc.get(spot, 'surroundingTiles', {}), (pos) => {
            let positionName = this.surroundingPositionToName[pos];
            if(positionName){
                usedNames[positionName] = true;
            }
        });
        return usedNames;
    }

    addNamedAnnotations(tiles, namedTiles, prefix, nameToPositionName, usedNames)
    {
        this.iteratePositions(namedTiles, (name, fi) => {
            let positionName = nameToPositionName ? nameToPositionName[name] : name;
            if(!positionName || usedNames[positionName]){
                return;
            }
            usedNames[positionName] = true;
            tiles.push({ id: fi, properties: [
                { name: 'key', type: 'string', value: prefix+positionName }
            ]});
        });
    }

    addSpotBorderAnnotations(tiles, spot, normalizedKey)
    {
        let usedNames = this.collectUsedSurroundingNames(spot);
        this.addNamedAnnotations(
            tiles,
            sc.get(spot, 'bordersTiles', {}),
            normalizedKey+'-',
            this.borderSideToSurroundingName,
            usedNames
        );
        this.addNamedAnnotations(
            tiles,
            sc.get(spot, 'borderCornersTiles', {}),
            normalizedKey+'-',
            null,
            usedNames
        );
    }

    addSpotAnnotations(tiles, spot)
    {
        let normalizedKey = this.normalizeSpotKey(spot.name);
        let spotTile = sc.get(spot, 'spotTile', null);
        if(null !== spotTile){
            tiles.push({ id: spotTile, properties: [
                { name: 'groundSpots', type: 'string', value: normalizedKey }
            ]});
            tiles.push({ id: spotTile, properties: [
                { name: 'key', type: 'string', value: normalizedKey+'-middle-center' }
            ]});
            let hasCorners = 0 < Object.keys(sc.get(spot, 'corners', {})).length;
            if(!hasCorners){
                this.addSyntheticCornerAnnotations(tiles, spotTile, normalizedKey);
            }
        }
        this.addPositionalAnnotations(
            tiles,
            spot.surroundingTiles,
            normalizedKey+'-',
            this.surroundingPositionToName
        );
        this.addPositionalAnnotations(
            tiles,
            spot.corners,
            normalizedKey+'-corner-',
            this.cornerPositionToName
        );
        this.addSpotBorderAnnotations(tiles, spot, normalizedKey);
    }

    collectAnnotatedFlatIds(tileOptions, spots)
    {
        let ids = [];
        let groundTile = sc.get(tileOptions, 'groundTile', null);
        if(null !== groundTile){
            ids.push(groundTile);
        }
        let pathTile = sc.get(tileOptions, 'pathTile', null);
        if(null !== pathTile){
            ids.push(pathTile);
        }
        this.appendFlatIdsList(ids, sc.get(tileOptions, 'groundTiles', []));
        this.collectPositionalIds(ids, sc.get(tileOptions, 'surroundingTiles', {}));
        this.collectPositionalIds(ids, sc.get(tileOptions, 'corners', {}));
        this.collectPositionalIds(ids, this.resolveBordersTiles(tileOptions));
        this.collectPositionalIds(ids, sc.get(tileOptions, 'borderInnerCornersTiles', {}));
        this.collectPositionalIds(ids, sc.get(tileOptions, 'mapBorderWallsTiles', {}));
        for(let spot of (spots ? spots : [])){
            this.collectSpotFlatIds(ids, spot);
        }
        return ids;
    }

    collectPositionalIds(ids, posObj)
    {
        this.iteratePositions(posObj, (pos, fi) => ids.push(fi));
    }

    appendVariationFlatIds(ids, tileOptions, spots)
    {
        let effectiveTileOptions = tileOptions ? tileOptions : {};
        this.appendFlatIdsList(ids, effectiveTileOptions.randomGroundTiles);
        for(let spot of (spots ? spots : [])){
            this.appendFlatIdsList(ids, spot.spotTileVariations);
        }
    }

    appendFlatIdsList(ids, flatIdsList)
    {
        if(!flatIdsList){
            return;
        }
        for(let flatId of flatIdsList){
            ids.push(flatId);
        }
    }

    collectSpotFlatIds(ids, spot)
    {
        let spotTile = sc.get(spot, 'spotTile', null);
        if(null !== spotTile){
            ids.push(spotTile);
        }
        this.collectPositionalIds(ids, spot.surroundingTiles);
        this.collectPositionalIds(ids, spot.corners);
        this.collectPositionalIds(ids, spot.bordersTiles);
        this.collectPositionalIds(ids, spot.borderCornersTiles);
        this.collectPositionalIds(ids, spot.innerWallsTiles);
        this.collectPositionalIds(ids, spot.innerWallsCornerTiles);
        this.collectPositionalIds(ids, spot.outerWallsTiles);
        this.collectPositionalIds(ids, spot.outerWallsCornerTiles);
    }
}

module.exports.CompositeTileAnnotationBuilder = CompositeTileAnnotationBuilder;
