/**
 *
 * Reldens - TileOptionsMerger
 *
 */

const { Helpers } = require('./helpers');
const { sc } = require('@reldens/utils');

class TileOptionsMerger
{

    resolveEntryWithTilesetIndex(entry, tilesets)
    {
        if(entry && undefined !== entry.flatIndex){
            return {
                value: entry.flatIndex,
                tilesetIndex: Math.max(0, Helpers.resolveEntryTilesetIndex(entry, tilesets))
            };
        }
        if(null === entry || undefined === entry){
            return null;
        }
        return {value: entry, tilesetIndex: 0};
    }

    resolvePositionalEntries(posObj, resolved, prop, tilesets)
    {
        resolved[prop] = {};
        let positions = Object.keys(posObj);
        for(let pos of positions){
            let entry = posObj[pos];
            if(null === entry || undefined === entry){
                continue;
            }
            resolved[prop][pos] = this.resolveEntryWithTilesetIndex(entry, tilesets);
        }
    }

    resolveRandomGroundList(entries, tilesets)
    {
        let result = [];
        for(let entry of entries){
            let resolved = this.resolveEntryWithTilesetIndex(entry, tilesets);
            if(null !== resolved){
                result.push(resolved);
            }
        }
        return result;
    }

    resolveGlobalToFlatOptions(globalTileOptions, tilesets)
    {
        if(!globalTileOptions){
            return null;
        }
        let resolved = {};
        let scalarProps = ['groundTile', 'pathTile', 'borderTile'];
        for(let prop of scalarProps){
            let entry = globalTileOptions[prop];
            if(null === entry || undefined === entry){
                continue;
            }
            resolved[prop] = this.resolveEntryWithTilesetIndex(entry, tilesets);
        }
        let positionalProps = ['surroundingTiles', 'corners', 'bordersTiles', 'borderCornersTiles'];
        for(let prop of positionalProps){
            let posObj = globalTileOptions[prop];
            if(!posObj){
                continue;
            }
            this.resolvePositionalEntries(posObj, resolved, prop, tilesets);
        }
        if(globalTileOptions.randomGroundTiles && globalTileOptions.randomGroundTiles.length){
            resolved.randomGroundTiles = this.resolveRandomGroundList(globalTileOptions.randomGroundTiles, tilesets);
        }
        return resolved;
    }

    mergeScalarTileOption(sizeTilesets, prop, fallback)
    {
        for(let ti = 0; ti < sizeTilesets.length; ti++){
            let tileOptions = sc.get(sizeTilesets[ti], 'tileOptions', null);
            if(!tileOptions){
                continue;
            }
            let value = sc.get(tileOptions, prop, null);
            if(null !== value && undefined !== value){
                return {value, tilesetIndex: ti};
            }
        }
        return fallback || null;
    }

    addTilesetPositionsToSet(tileset, prop, allPositions)
    {
        let tileOptions = sc.get(tileset, 'tileOptions', null);
        if(!tileOptions || !tileOptions[prop]){
            return;
        }
        for(let key of Object.keys(tileOptions[prop])){
            allPositions.add(key);
        }
    }

    collectAllPositions(sizeTilesets, prop, fallback)
    {
        let allPositions = new Set();
        for(let tileset of sizeTilesets){
            this.addTilesetPositionsToSet(tileset, prop, allPositions);
        }
        if(fallback){
            for(let key of Object.keys(fallback)){
                allPositions.add(key);
            }
        }
        return allPositions;
    }

    resolvePositionFromTilesets(sizeTilesets, prop, pos)
    {
        for(let ti = 0; ti < sizeTilesets.length; ti++){
            let tileOptions = sc.get(sizeTilesets[ti], 'tileOptions', null);
            if(!tileOptions || !tileOptions[prop]){
                continue;
            }
            let value = tileOptions[prop][pos];
            if(null !== value && undefined !== value){
                return {value, tilesetIndex: ti};
            }
        }
        return null;
    }

    mergePositionalTileOption(sizeTilesets, prop, fallback)
    {
        let allPositions = this.collectAllPositions(sizeTilesets, prop, fallback);
        if(!allPositions.size){
            return null;
        }
        let result = {};
        for(let pos of allPositions){
            let resolved = this.resolvePositionFromTilesets(sizeTilesets, prop, pos);
            if(resolved){
                result[pos] = resolved;
                continue;
            }
            if(fallback && fallback[pos]){
                result[pos] = fallback[pos];
            }
        }
        return result;
    }

    wrapListWithTilesetIndex(values, ti)
    {
        let result = [];
        for(let value of values){
            result.push({value, tilesetIndex: ti});
        }
        return result;
    }

    resolveRandomFromTilesets(sizeTilesets)
    {
        for(let ti = 0; ti < sizeTilesets.length; ti++){
            let tileOptions = sc.get(sizeTilesets[ti], 'tileOptions', null);
            if(!tileOptions || !tileOptions.randomGroundTiles || !tileOptions.randomGroundTiles.length){
                continue;
            }
            return this.wrapListWithTilesetIndex(tileOptions.randomGroundTiles, ti);
        }
        return null;
    }

    applyFirstgidToScalar(resolved, firstgids)
    {
        if(!resolved){
            return null;
        }
        return firstgids[resolved.tilesetIndex] + resolved.value;
    }

    applyFirstgidToPositional(resolved, firstgids)
    {
        if(!resolved){
            return null;
        }
        let result = {};
        for(let pos of Object.keys(resolved)){
            let entry = resolved[pos];
            if(!entry){
                continue;
            }
            result[pos] = firstgids[entry.tilesetIndex] + entry.value;
        }
        return result;
    }

    applyFirstgidToRandomList(resolvedList, firstgids)
    {
        if(!resolvedList || !resolvedList.length){
            return null;
        }
        let result = [];
        for(let entry of resolvedList){
            if(!entry){
                continue;
            }
            result.push(firstgids[entry.tilesetIndex] + entry.value);
        }
        return result;
    }

    applyScalarTileOptions(merged, sizeTilesets, resolvedGlobal, firstgids)
    {
        let scalarProps = ['groundTile', 'pathTile', 'borderTile'];
        for(let prop of scalarProps){
            let fallback = resolvedGlobal ? sc.get(resolvedGlobal, prop, null) : null;
            let resolved = this.mergeScalarTileOption(sizeTilesets, prop, fallback);
            let value = this.applyFirstgidToScalar(resolved, firstgids);
            if(null !== value && undefined !== value){
                merged[prop] = value;
            }
        }
    }

    applyPositionalTileOptions(merged, sizeTilesets, resolvedGlobal, firstgids)
    {
        let positionalProps = ['surroundingTiles', 'corners', 'bordersTiles', 'borderCornersTiles'];
        for(let prop of positionalProps){
            let fallback = resolvedGlobal ? sc.get(resolvedGlobal, prop, null) : null;
            let resolved = this.mergePositionalTileOption(sizeTilesets, prop, fallback);
            let value = this.applyFirstgidToPositional(resolved, firstgids);
            if(value && Object.keys(value).length){
                merged[prop] = value;
            }
        }
    }

    applyRandomGroundTiles(merged, sizeTilesets, resolvedGlobal, firstgids)
    {
        let tilesetResolved = this.resolveRandomFromTilesets(sizeTilesets);
        if(tilesetResolved){
            merged.randomGroundTiles = this.applyFirstgidToRandomList(tilesetResolved, firstgids);
            return;
        }
        if(resolvedGlobal && resolvedGlobal.randomGroundTiles && resolvedGlobal.randomGroundTiles.length){
            merged.randomGroundTiles = this.applyFirstgidToRandomList(resolvedGlobal.randomGroundTiles, firstgids);
        }
    }

    merge(sizeTilesets, globalTileOptions, firstgids)
    {
        let resolvedGlobal = this.resolveGlobalToFlatOptions(globalTileOptions, sizeTilesets);
        let merged = {};
        this.applyScalarTileOptions(merged, sizeTilesets, resolvedGlobal, firstgids);
        this.applyPositionalTileOptions(merged, sizeTilesets, resolvedGlobal, firstgids);
        this.applyRandomGroundTiles(merged, sizeTilesets, resolvedGlobal, firstgids);
        if(!Object.keys(merged).length){
            return null;
        }
        return merged;
    }

}

module.exports.TileOptionsMerger = TileOptionsMerger;
