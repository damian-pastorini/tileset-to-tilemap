/**
 *
 * Reldens - TileOptionsMerger
 *
 */

const { Helpers } = require('./helpers');
const { TilesetConst } = require('./constants');
const { sc } = require('@reldens/utils');

class TileOptionsMerger
{

    constructor()
    {
        this.scalarTileProps = TilesetConst.SCALAR_TILE_PROPS;
        this.listTileProps = TilesetConst.LIST_TILE_PROPS;
        this.positionalTileProps = TilesetConst.POSITIONAL_TILE_PROPS;
    }

    resolveEntryWithTilesetIndex(entry, tilesets)
    {
        if(entry && 'undefined' !== typeof entry.flatIndex){
            return {
                value: entry.flatIndex,
                tilesetIndex: Math.max(0, Helpers.resolveEntryTilesetIndex(entry, tilesets))
            };
        }
        if(null === entry || 'undefined' === typeof entry){
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
            if(null === entry || 'undefined' === typeof entry){
                continue;
            }
            resolved[prop][pos] = this.resolveEntryWithTilesetIndex(entry, tilesets);
        }
    }

    resolveListEntries(entries, tilesets)
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
        for(let prop of this.scalarTileProps){
            let entry = globalTileOptions[prop];
            if(null === entry || 'undefined' === typeof entry){
                continue;
            }
            resolved[prop] = this.resolveEntryWithTilesetIndex(entry, tilesets);
        }
        for(let prop of this.positionalTileProps){
            let posObj = globalTileOptions[prop];
            if(!posObj){
                continue;
            }
            this.resolvePositionalEntries(posObj, resolved, prop, tilesets);
        }
        for(let prop of this.listTileProps){
            let entries = globalTileOptions[prop];
            if(!entries || !entries.length){
                continue;
            }
            resolved[prop] = this.resolveListEntries(entries, tilesets);
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
            if(null !== value && 'undefined' !== typeof value){
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
            if(null !== value && 'undefined' !== typeof value){
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

    resolveListFromTilesets(sizeTilesets, prop)
    {
        for(let ti = 0; ti < sizeTilesets.length; ti++){
            let tileOptions = sc.get(sizeTilesets[ti], 'tileOptions', null);
            if(!tileOptions || !tileOptions[prop] || !tileOptions[prop].length){
                continue;
            }
            return this.wrapListWithTilesetIndex(tileOptions[prop], ti);
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
        for(let prop of this.scalarTileProps){
            let fallback = resolvedGlobal ? sc.get(resolvedGlobal, prop, null) : null;
            let resolved = this.mergeScalarTileOption(sizeTilesets, prop, fallback);
            let value = this.applyFirstgidToScalar(resolved, firstgids);
            if(null !== value && 'undefined' !== typeof value){
                merged[prop] = value;
            }
        }
    }

    applyPositionalTileOptions(merged, sizeTilesets, resolvedGlobal, firstgids)
    {
        for(let prop of this.positionalTileProps){
            let fallback = resolvedGlobal ? sc.get(resolvedGlobal, prop, null) : null;
            let resolved = this.mergePositionalTileOption(sizeTilesets, prop, fallback);
            let value = this.applyFirstgidToPositional(resolved, firstgids);
            if(value && Object.keys(value).length){
                merged[prop] = value;
            }
        }
    }

    applyListTileOptions(merged, sizeTilesets, resolvedGlobal, firstgids)
    {
        for(let prop of this.listTileProps){
            this.applyListTileOption(merged, sizeTilesets, resolvedGlobal, firstgids, prop);
        }
    }

    applyListTileOption(merged, sizeTilesets, resolvedGlobal, firstgids, prop)
    {
        let resolvedList = this.resolveListFromTilesets(sizeTilesets, prop);
        if(!resolvedList){
            resolvedList = resolvedGlobal ? sc.get(resolvedGlobal, prop, null) : null;
        }
        let flatList = this.applyFirstgidToRandomList(resolvedList, firstgids);
        if(flatList && flatList.length){
            merged[prop] = flatList;
        }
    }

    applyGroundTilesSelection(merged)
    {
        let groundTiles = sc.get(merged, 'groundTiles', []);
        if(0 === groundTiles.length){
            return;
        }
        if(1 < groundTiles.length){
            delete merged.groundTile;
            return;
        }
        delete merged.groundTiles;
        let groundTile = sc.get(merged, 'groundTile', null);
        if(null !== groundTile && 'undefined' !== typeof groundTile){
            return;
        }
        merged.groundTile = groundTiles.pop();
    }

    merge(sizeTilesets, globalTileOptions, firstgids)
    {
        let resolvedGlobal = this.resolveGlobalToFlatOptions(globalTileOptions, sizeTilesets);
        let merged = {};
        this.applyScalarTileOptions(merged, sizeTilesets, resolvedGlobal, firstgids);
        this.applyPositionalTileOptions(merged, sizeTilesets, resolvedGlobal, firstgids);
        this.applyListTileOptions(merged, sizeTilesets, resolvedGlobal, firstgids);
        this.applyGroundTilesSelection(merged);
        if(!Object.keys(merged).length){
            return null;
        }
        return merged;
    }

}

module.exports.TileOptionsMerger = TileOptionsMerger;
