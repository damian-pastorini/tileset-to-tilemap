/**
 *
 * Reldens - CompositeTileAnnotationBuilder
 *
 */

class CompositeTileAnnotationBuilder
{

    constructor()
    {
        this.surroundingPositionToName = {
            '-1,-1': 'top-left',
            '-1,0': 'top-center',
            '-1,1': 'top-right',
            '0,-1': 'middle-left',
            '0,0': 'middle-center',
            '0,1': 'middle-right',
            '1,-1': 'bottom-left',
            '1,0': 'bottom-center',
            '1,1': 'bottom-right'
        };
        this.cornerPositionToName = {
            '-1,-1': 'top-left',
            '-1,1': 'top-right',
            '1,-1': 'bottom-left',
            '1,1': 'bottom-right'
        };
    }

    normalizeSpotKey(spotName)
    {
        if(!spotName){
            return '';
        }
        return spotName.replace(/-/g, '_');
    }

    buildTileAnnotations(tileOptions, spots)
    {
        let tiles = [];
        let opts = tileOptions ? tileOptions : {};
        this.addSimpleAnnotation(tiles, opts.groundTile, 'groundTile');
        this.addSimpleAnnotation(tiles, opts.pathTile, 'pathTile');
        this.addPositionalAnnotations(tiles, opts.surroundingTiles, '', this.surroundingPositionToName);
        this.addPositionalAnnotations(tiles, opts.corners, 'corner-', this.cornerPositionToName);
        let bordersTiles = this.resolveBordersTiles(opts);
        this.addPositionalAnnotations(tiles, bordersTiles, 'border-', null);
        for(let spot of (spots ? spots : [])){
            if(!spot.name){
                continue;
            }
            this.addSpotAnnotations(tiles, spot);
        }
        return this.mergeDuplicateTileAnnotations(tiles);
    }

    copyPropertiesIntoEntry(entry, properties)
    {
        for(let prop of properties){
            entry.properties.push(prop);
        }
    }

    mergeDuplicateTileAnnotations(tiles)
    {
        let byId = {};
        let order = [];
        for(let tile of tiles){
            if(undefined === byId[tile.id]){
                byId[tile.id] = { id: tile.id, properties: [] };
                order.push(tile.id);
            }
            this.copyPropertiesIntoEntry(byId[tile.id], tile.properties);
        }
        let merged = [];
        for(let id of order){
            merged.push(byId[id]);
        }
        return merged;
    }

    resolveBordersTiles(opts)
    {
        let bordersTiles = opts.bordersTiles;
        if(bordersTiles && 0 < Object.keys(bordersTiles).length){
            return bordersTiles;
        }
        if(null === opts.borderTile || undefined === opts.borderTile){
            return null;
        }
        return {
            top: opts.borderTile,
            right: opts.borderTile,
            bottom: opts.borderTile,
            left: opts.borderTile
        };
    }

    iteratePositions(posObj, callback)
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
            callback(pos, fi);
        }
    }

    addSimpleAnnotation(tiles, flatIndex, keyValue)
    {
        if(null === flatIndex || undefined === flatIndex){
            return;
        }
        tiles.push({ id: flatIndex, properties: [{ name: 'key', type: 'string', value: keyValue }] });
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

    addSpotAnnotations(tiles, spot)
    {
        let normalizedKey = this.normalizeSpotKey(spot.name);
        if(null !== spot.spotTile && undefined !== spot.spotTile){
            tiles.push({ id: spot.spotTile, properties: [
                { name: 'groundSpots', type: 'string', value: normalizedKey }
            ]});
            tiles.push({ id: spot.spotTile, properties: [
                { name: 'key', type: 'string', value: normalizedKey+'-middle-center' }
            ]});
            let hasCorners = spot.corners && 0 < Object.keys(spot.corners).length;
            if(!hasCorners){
                this.addSyntheticCornerAnnotations(tiles, spot.spotTile, normalizedKey);
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
    }

    collectAnnotatedFlatIds(tileOptions, spots)
    {
        let ids = [];
        let opts = tileOptions ? tileOptions : {};
        if(null !== opts.groundTile && undefined !== opts.groundTile){
            ids.push(opts.groundTile);
        }
        if(null !== opts.pathTile && undefined !== opts.pathTile){
            ids.push(opts.pathTile);
        }
        this.collectPositionalIds(ids, opts.surroundingTiles);
        this.collectPositionalIds(ids, opts.corners);
        this.collectPositionalIds(ids, this.resolveBordersTiles(opts));
        for(let spot of spots){
            this.collectSpotFlatIds(ids, spot);
        }
        return ids;
    }

    collectPositionalIds(ids, posObj)
    {
        this.iteratePositions(posObj, (pos, fi) => ids.push(fi));
    }

    collectSpotFlatIds(ids, spot)
    {
        if(null !== spot.spotTile && undefined !== spot.spotTile){
            ids.push(spot.spotTile);
        }
        this.collectPositionalIds(ids, spot.surroundingTiles);
        this.collectPositionalIds(ids, spot.corners);
        this.collectPositionalIds(ids, spot.innerWallsTiles);
        this.collectPositionalIds(ids, spot.innerWallsCornerTiles);
        this.collectPositionalIds(ids, spot.outerWallsTiles);
        this.collectPositionalIds(ids, spot.outerWallsCornerTiles);
    }
}

module.exports.CompositeTileAnnotationBuilder = CompositeTileAnnotationBuilder;
