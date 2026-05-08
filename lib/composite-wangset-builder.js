/**
 *
 * Reldens - CompositeWangsetBuilder
 *
 */

class CompositeWangsetBuilder
{

    normalizeSpotKey(spotName)
    {
        if(!spotName){
            return '';
        }
        return spotName.replace(/-/g, '_');
    }

    getWangids()
    {
        return {
            '-1,-1': [0,0,0,1,0,0,0,0],
            '-1,0':  [0,0,0,1,0,1,0,0],
            '-1,1':  [0,0,0,0,0,1,0,0],
            '0,-1':  [0,1,0,1,0,0,0,0],
            '0,0':   [0,1,0,1,0,1,0,1],
            '0,1':   [0,0,0,0,0,1,0,1],
            '1,-1':  [0,1,0,0,0,0,0,0],
            '1,0':   [0,1,0,0,0,0,0,1],
            '1,1':   [0,0,0,0,0,0,0,1]
        };
    }

    getCornerWangids()
    {
        return {
            'top-left':     [0,1,0,1,0,1,0,0],
            'top-right':    [0,0,0,1,0,1,0,1],
            'bottom-left':  [0,1,0,1,0,0,0,1],
            'bottom-right': [0,1,0,0,0,1,0,1]
        };
    }

    buildWangtiles(tiles, wangids)
    {
        let wangtiles = [];
        for(let pos of Object.keys(tiles)){
            let tileid = tiles[pos];
            if(null === tileid || undefined === tileid){
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

    buildWangset(name, representativeTile, tiles, wangids)
    {
        let wangtiles = this.buildWangtiles(tiles, wangids);
        if(!wangtiles.length){
            return null;
        }
        return {
            name,
            colors: [],
            type: 'corner',
            tile: null !== representativeTile && undefined !== representativeTile ? representativeTile : -1,
            wangtiles
        };
    }

    mergeAndBuildWangset(name, centerTile, wallsTiles, cornerTiles, allWangids)
    {
        let hasTiles = wallsTiles && Object.keys(wallsTiles).length;
        let hasCorners = cornerTiles && Object.keys(cornerTiles).length;
        if(!hasTiles && !hasCorners){
            return null;
        }
        return this.buildWangset(name, centerTile, Object.assign({}, wallsTiles || {}, cornerTiles || {}), allWangids);
    }

    buildSpotWangsets(spots)
    {
        let wangsets = [];
        let allWangids = Object.assign({}, this.getWangids(), this.getCornerWangids());
        for(let spot of spots){
            if(!spot.name){
                continue;
            }
            let key = this.normalizeSpotKey(spot.name);
            let centerTile = null !== spot.spotTile && undefined !== spot.spotTile ? spot.spotTile : -1;
            let innerWangset = this.mergeAndBuildWangset(
                key+'-inner-walls', centerTile, spot.innerWallsTiles, spot.innerWallsCornerTiles, allWangids
            );
            if(innerWangset){
                wangsets.push(innerWangset);
            }
            let outerWangset = this.mergeAndBuildWangset(
                key+'-outer-walls', centerTile, spot.outerWallsTiles, spot.outerWallsCornerTiles, allWangids
            );
            if(outerWangset){
                wangsets.push(outerWangset);
            }
        }
        return wangsets;
    }
}

module.exports.CompositeWangsetBuilder = CompositeWangsetBuilder;
