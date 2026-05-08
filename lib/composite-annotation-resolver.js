/**
 *
 * Reldens - CompositeAnnotationResolver
 *
 */

class CompositeAnnotationResolver
{
    constructor()
    {
        this.scalarTileProps = ['groundTile', 'pathTile', 'borderTile'];
        this.positionalTileProps = ['surroundingTiles', 'corners', 'bordersTiles'];
    }

    resolve(tilesets, globalTileOptions)
    {
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
        if(!entry || undefined === entry.tilesetIndex || undefined === entry.flatIndex){
            return -1;
        }
        return entry.tilesetIndex;
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

    applyRandomTileEntry(effectiveOptions, entry)
    {
        let ti = entry.tilesetIndex !== undefined ? entry.tilesetIndex : 0;
        this.ensureEffectiveSlot(effectiveOptions, ti);
        if(!effectiveOptions[ti].randomGroundTiles){
            effectiveOptions[ti].randomGroundTiles = [];
        }
        effectiveOptions[ti].randomGroundTiles.push(entry.flatIndex);
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
        if(!globalTileOptions.randomGroundTiles || !globalTileOptions.randomGroundTiles.length){
            return;
        }
        for(let entry of globalTileOptions.randomGroundTiles){
            this.applyRandomTileEntry(effectiveOptions, entry);
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

    mergeScalarProps(opts, effective, claimedScalar)
    {
        for(let prop of this.scalarTileProps){
            if(claimedScalar[prop]){
                continue;
            }
            if(null === opts[prop] || undefined === opts[prop]){
                continue;
            }
            effective[prop] = opts[prop];
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

    mergePositionalProp(opts, prop, effective, claimedPositional)
    {
        if(!opts[prop]){
            return;
        }
        let positions = Object.keys(opts[prop]);
        for(let pos of positions){
            this.mergePositionalEntry(pos, opts[prop][pos], effective, prop, claimedPositional);
        }
    }

    mergeTilesetOptions(ti, tilesets, effectiveOptions, claimedScalar, claimedPositional, claimedRandom)
    {
        let opts = tilesets[ti].tileOptions;
        if(!opts){
            return claimedRandom;
        }
        let effective = {};
        this.mergeScalarProps(opts, effective, claimedScalar);
        for(let prop of this.positionalTileProps){
            this.mergePositionalProp(opts, prop, effective, claimedPositional);
        }
        if(!claimedRandom && opts.randomGroundTiles && opts.randomGroundTiles.length){
            effective.randomGroundTiles = opts.randomGroundTiles;
            claimedRandom = true;
        }
        if(Object.keys(effective).length){
            effectiveOptions[ti] = effective;
        }
        return claimedRandom;
    }

    applyMergedToEffective(tilesets, effectiveOptions)
    {
        let claimedScalar = {};
        let claimedPositional = {};
        let claimedRandom = false;
        for(let ti = 0; ti < tilesets.length; ti++){
            claimedRandom = this.mergeTilesetOptions(
                ti,
                tilesets,
                effectiveOptions,
                claimedScalar,
                claimedPositional,
                claimedRandom
            );
        }
    }

    resolvePathTileCompositeId(effectivePerTileset, firstgids)
    {
        if(!effectivePerTileset){
            return null;
        }
        for(let ti = 0; ti < effectivePerTileset.length; ti++){
            let opts = effectivePerTileset[ti];
            if(opts && null !== opts.pathTile && undefined !== opts.pathTile){
                return firstgids[ti] + opts.pathTile;
            }
        }
        return null;
    }
}

module.exports.CompositeAnnotationResolver = CompositeAnnotationResolver;
