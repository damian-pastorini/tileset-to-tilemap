/**
 *
 * Reldens - CompositeWangsetBuilder
 *
 * The surrounding tiles and the corner tiles are looked up in SEPARATE wangid tables, never in a merged one. The
 * editor saves both under the same grid keys, so a single merged table would resolve a corner tile to the
 * surrounding wangid for that position and no corner wangid would ever be emitted. TilesetConst.SPOT_CORNER_WANGIDS
 * is keyed by grid key and by corner name, so both saved conventions resolve.
 *
 */

const { TilesetConst } = require('./constants');
const { sc } = require('@reldens/utils');

class CompositeWangsetBuilder
{

    normalizeSpotKey(spotName)
    {
        if(!spotName){
            return '';
        }
        return spotName.replace(/-/g, '_');
    }

    buildWangtiles(tiles, wangids)
    {
        let wangtiles = [];
        for(let pos of Object.keys(sc.isObject(tiles) ? tiles : {})){
            let tileid = tiles[pos];
            if(null === tileid || 'undefined' === typeof tileid){
                continue;
            }
            let wangid = wangids[pos];
            if(!wangid){
                continue;
            }
            wangtiles.push({ tileid, wangid });
        }
        return wangtiles;
    }

    buildWangset(name, representativeTile, tiles, cornerTiles)
    {
        let wangtiles = this.buildWangtiles(tiles, TilesetConst.SPOT_SURROUNDING_WANGIDS)
            .concat(this.buildWangtiles(cornerTiles, TilesetConst.SPOT_CORNER_WANGIDS));
        if(!wangtiles.length){
            return null;
        }
        let mainTile = -1;
        if(null !== representativeTile && 'undefined' !== typeof representativeTile){
            mainTile = representativeTile;
        }
        return {
            name,
            colors: [{name, color: '#ff0000', probability: 1, tile: mainTile}],
            type: 'mixed',
            tile: mainTile,
            wangtiles
        };
    }

    resolveCenterTile(spot)
    {
        let spotTile = sc.get(spot, 'spotTile', -1);
        return null === spotTile ? -1 : spotTile;
    }

    buildSpotGroundTiles(spot, centerTile)
    {
        let groundTiles = Object.assign({}, sc.get(spot, 'surroundingTiles', {}));
        if(-1 !== centerTile && !sc.hasOwn(groundTiles, '0,0')){
            groundTiles['0,0'] = centerTile;
        }
        return groundTiles;
    }

    remapWallsPositions(tiles, positionsMap)
    {
        let remappedTiles = {};
        for(let pickedPosition of Object.keys(positionsMap)){
            let tileid = sc.get(tiles, pickedPosition, null);
            if(null === tileid || 'undefined' === typeof tileid){
                continue;
            }
            remappedTiles[positionsMap[pickedPosition]] = tileid;
        }
        return remappedTiles;
    }

    buildMapBorderWallsWangset(tileOptions)
    {
        let mapBorderWallsTiles = sc.get(tileOptions, 'mapBorderWallsTiles', {});
        return this.buildWangset(
            TilesetConst.MAP_BORDER_WALLS_WANGSET_NAME,
            sc.get(mapBorderWallsTiles, '-1,0', -1),
            this.remapWallsPositions(mapBorderWallsTiles, TilesetConst.MAP_BORDER_WALLS_SURROUNDING_POSITIONS),
            this.remapWallsPositions(mapBorderWallsTiles, TilesetConst.MAP_BORDER_WALLS_CORNER_POSITIONS)
        );
    }

    buildSpotWangsets(spots)
    {
        let wangsets = [];
        for(let spot of spots){
            if(!spot.name){
                continue;
            }
            this.appendSpotWangsets(wangsets, spot);
        }
        return wangsets;
    }

    appendSpotWangsets(wangsets, spot)
    {
        let key = this.normalizeSpotKey(spot.name);
        let centerTile = this.resolveCenterTile(spot);
        let spotWangsets = [
            this.buildWangset(key, centerTile, this.buildSpotGroundTiles(spot, centerTile), spot.corners),
            this.buildWangset(key+'-inner-walls', centerTile, spot.innerWallsTiles, spot.innerWallsCornerTiles),
            this.buildWangset(key+'-outer-walls', centerTile, spot.outerWallsTiles, spot.outerWallsCornerTiles)
        ];
        for(let spotWangset of spotWangsets){
            if(spotWangset){
                wangsets.push(spotWangset);
            }
        }
        return wangsets;
    }

}

module.exports.CompositeWangsetBuilder = CompositeWangsetBuilder;
