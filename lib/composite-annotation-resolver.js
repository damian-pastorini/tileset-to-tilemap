/**
 *
 * Reldens - CompositeAnnotationResolver
 *
 */

const { Helpers } = require('./helpers');
const { TilesetConst } = require('./constants');

class CompositeAnnotationResolver
{
    constructor()
    {
        this.scalarTileProps = TilesetConst.SCALAR_TILE_PROPS;
        this.positionalTileProps = TilesetConst.POSITIONAL_TILE_PROPS;
        this.listTileProps = TilesetConst.LIST_TILE_PROPS;
    }

    resolve(tilesets, globalTileOptions)
    {
        this.tilesets = tilesets;
        let effectiveOptions = [];
        for(let i = 0; i < tilesets.length; i++){
            effectiveOptions.push(null);
        }
        this.applyMergedToEffective(tilesets, effectiveOptions);
        if(globalTileOptions){
            this.applyGlobalAsDefault(globalTileOptions, effectiveOptions);
        }
        return effectiveOptions;
    }

    ensureEffectiveSlot(effectiveOptions, ti)
    {
        if(!effectiveOptions[ti]){
            effectiveOptions[ti] = {};
        }
    }

    validateAndGetTi(entry)
    {
        if(!entry || undefined === entry.flatIndex){
            return -1;
        }
        return Helpers.resolveEntryTilesetIndex(entry, this.tilesets);
    }

    resolveEntrySlot(effectiveOptions, prop, pos, entry)
    {
        let ti = this.validateAndGetTi(entry);
        if(-1 === ti){
            return -1;
        }
        this.ensureEffectiveSlot(effectiveOptions, ti);
        if(null !== pos && !effectiveOptions[ti][prop]){
            effectiveOptions[ti][prop] = {};
        }
        return ti;
    }

    applyEntryInternal(effectiveOptions, prop, pos, entry, shouldAssign)
    {
        let ti = this.resolveEntrySlot(effectiveOptions, prop, pos, entry);
        if(-1 === ti){
            return;
        }
        if(null === pos){
            if(shouldAssign(effectiveOptions[ti][prop])){
                effectiveOptions[ti][prop] = entry.flatIndex;
            }
            return;
        }
        if(shouldAssign(effectiveOptions[ti][prop][pos])){
            effectiveOptions[ti][prop][pos] = entry.flatIndex;
        }
    }

    applyEntry(effectiveOptions, prop, pos, entry)
    {
        this.applyEntryInternal(effectiveOptions, prop, pos, entry, () => true);
    }

    applyEntryAsDefault(effectiveOptions, prop, pos, entry)
    {
        this.applyEntryInternal(
            effectiveOptions,
            prop,
            pos,
            entry,
            (current) => null === current || undefined === current
        );
    }

    applyRandomTileEntry(effectiveOptions, entry, prop)
    {
        let ti = Math.max(0, Helpers.resolveEntryTilesetIndex(entry, this.tilesets));
        this.ensureEffectiveSlot(effectiveOptions, ti);
        if(!effectiveOptions[ti][prop]){
            effectiveOptions[ti][prop] = [];
        }
        effectiveOptions[ti][prop].push(entry.flatIndex);
    }

    applyGlobalPositionalWithFn(globalTileOptions, prop, effectiveOptions, applyFn)
    {
        let posObj = globalTileOptions[prop];
        if(!posObj){
            return;
        }
        let positions = Object.keys(posObj);
        for(let pos of positions){
            applyFn(effectiveOptions, prop, pos, posObj[pos]);
        }
    }

    applyGlobalWithFn(globalTileOptions, effectiveOptions, applyFn)
    {
        for(let prop of this.scalarTileProps){
            applyFn(effectiveOptions, prop, null, globalTileOptions[prop]);
        }
        for(let prop of this.positionalTileProps){
            this.applyGlobalPositionalWithFn(globalTileOptions, prop, effectiveOptions, applyFn);
        }
        for(let prop of this.listTileProps){
            this.applyGlobalListEntries(globalTileOptions, effectiveOptions, prop);
        }
    }

    applyGlobalListEntries(globalTileOptions, effectiveOptions, prop)
    {
        let entries = globalTileOptions[prop];
        if(!entries || !entries.length){
            return;
        }
        for(let entry of entries){
            this.applyRandomTileEntry(effectiveOptions, entry, prop);
        }
    }

    applyGlobalToEffective(globalTileOptions, effectiveOptions)
    {
        this.applyGlobalWithFn(globalTileOptions, effectiveOptions, this.applyEntry.bind(this));
    }

    applyGlobalAsDefault(globalTileOptions, effectiveOptions)
    {
        this.applyGlobalWithFn(globalTileOptions, effectiveOptions, this.applyEntryAsDefault.bind(this));
    }

    mergeScalarProps(tileOptions, effective, claimedScalar)
    {
        for(let prop of this.scalarTileProps){
            if(claimedScalar[prop]){
                continue;
            }
            if(null === tileOptions[prop] || undefined === tileOptions[prop]){
                continue;
            }
            effective[prop] = tileOptions[prop];
            claimedScalar[prop] = true;
        }
    }

    mergePositionalEntry(pos, fi, effective, prop, claimedPositional)
    {
        let claimKey = prop+':'+pos;
        if(claimedPositional[claimKey]){
            return;
        }
        if(null === fi || undefined === fi){
            return;
        }
        if(!effective[prop]){
            effective[prop] = {};
        }
        effective[prop][pos] = fi;
        claimedPositional[claimKey] = true;
    }

    mergePositionalProp(tileOptions, prop, effective, claimedPositional)
    {
        if(!tileOptions[prop]){
            return;
        }
        let positions = Object.keys(tileOptions[prop]);
        for(let pos of positions){
            this.mergePositionalEntry(pos, tileOptions[prop][pos], effective, prop, claimedPositional);
        }
    }

    mergeTilesetOptions(ti, tilesets, effectiveOptions, claimedScalar, claimedPositional, claimedLists)
    {
        let tileOptions = tilesets[ti].tileOptions;
        if(!tileOptions){
            return;
        }
        let effective = {};
        this.mergeScalarProps(tileOptions, effective, claimedScalar);
        for(let prop of this.positionalTileProps){
            this.mergePositionalProp(tileOptions, prop, effective, claimedPositional);
        }
        for(let prop of this.listTileProps){
            this.mergeListProp(tileOptions, prop, effective, claimedLists);
        }
        if(Object.keys(effective).length){
            effectiveOptions[ti] = effective;
        }
    }

    mergeListProp(tileOptions, prop, effective, claimedLists)
    {
        if(claimedLists[prop]){
            return;
        }
        if(!tileOptions[prop] || !tileOptions[prop].length){
            return;
        }
        effective[prop] = tileOptions[prop];
        claimedLists[prop] = true;
    }

    applyMergedToEffective(tilesets, effectiveOptions)
    {
        let claimedScalar = {};
        let claimedPositional = {};
        let claimedLists = {};
        for(let ti = 0; ti < tilesets.length; ti++){
            this.mergeTilesetOptions(
                ti,
                tilesets,
                effectiveOptions,
                claimedScalar,
                claimedPositional,
                claimedLists
            );
        }
    }

    resolvePathTileCompositeId(effectivePerTileset, firstgids)
    {
        if(!effectivePerTileset){
            return null;
        }
        for(let ti = 0; ti < effectivePerTileset.length; ti++){
            let tileOptions = effectivePerTileset[ti];
            if(tileOptions && null !== tileOptions.pathTile && undefined !== tileOptions.pathTile){
                return firstgids[ti] + tileOptions.pathTile;
            }
        }
        return null;
    }
}

module.exports.CompositeAnnotationResolver = CompositeAnnotationResolver;
