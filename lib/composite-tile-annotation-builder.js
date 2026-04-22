/**
 *
 * Reldens - CompositeTileAnnotationBuilder
 *
 */

class CompositeTileAnnotationBuilder
{

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
        this.collectPositionalIds(ids, opts.bordersTiles);
        for(let spot of spots){
            this.collectSpotFlatIds(ids, spot);
        }
        return ids;
    }

    collectPositionalIds(ids, posObj)
    {
        if(!posObj){
            return;
        }
        let positions = Object.keys(posObj);
        for(let pos of positions){
            let fi = posObj[pos];
            if(null !== fi && undefined !== fi){
                ids.push(fi);
            }
        }
    }

    collectSpotFlatIds(ids, spot)
    {
        if(null !== spot.spotTile && undefined !== spot.spotTile){
            ids.push(spot.spotTile);
        }
        this.collectPositionalIds(ids, spot.surroundingTiles);
        this.collectPositionalIds(ids, spot.corners);
    }
}

module.exports.CompositeTileAnnotationBuilder = CompositeTileAnnotationBuilder;
