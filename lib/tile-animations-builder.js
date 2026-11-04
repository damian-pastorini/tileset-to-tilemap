/**
 *
 * Reldens - TileAnimationsBuilder
 *
 * Expands the editor tile animations into Tiled tile animation entries. Every animation is stored in the
 * session with a base tile, an optional animation default duration and its frames, where each frame can
 * override the duration. The duration is resolved as frame, animation, tileset and then the default
 * duration constant. Animations are emitted only when the base tile is used by the tileset elements or by
 * the annotated tiles, so unused animated tiles are not forced into the optimized tileset image.
 *
 */

const { TilesetConst } = require('./constants');
const { sc } = require('@reldens/utils');

class TileAnimationsBuilder
{

    /**
     * @param {Object} tileset
     * @param {Array<number>} annotatedFlatIds
     * @returns {Array<Object>}
     */
    build(tileset, annotatedFlatIds)
    {
        let tileAnimations = sc.get(tileset, 'tileAnimations', []);
        if(!sc.isArray(tileAnimations) || 0 === tileAnimations.length){
            return [];
        }
        let usedTileIds = this.collectUsedTileIds(tileset, annotatedFlatIds);
        let tilesetDuration = sc.get(tileset, 'animationsDefaultDuration', null);
        let entries = [];
        for(let tileAnimation of tileAnimations){
            this.appendAnimationEntry(entries, tileAnimation, tilesetDuration, usedTileIds);
        }
        return entries;
    }

    /**
     * @param {Array<Object>} entries
     * @param {Object} tileAnimation
     * @param {number|null} tilesetDuration
     * @param {Array<number>} usedTileIds
     */
    appendAnimationEntry(entries, tileAnimation, tilesetDuration, usedTileIds)
    {
        let baseTile = this.fetchTileId(sc.get(tileAnimation, 'baseTile', null));
        if(null === baseTile){
            return;
        }
        if(-1 === usedTileIds.indexOf(baseTile)){
            return;
        }
        let frames = this.buildFrames(tileAnimation, baseTile, tilesetDuration);
        if(0 === frames.length){
            return;
        }
        entries.push({id: baseTile, animation: frames});
    }

    /**
     * @param {Object} tileAnimation
     * @param {number} baseTile
     * @param {number|null} tilesetDuration
     * @returns {Array<Object>}
     */
    buildFrames(tileAnimation, baseTile, tilesetDuration)
    {
        let animationDuration = sc.get(tileAnimation, 'defaultDuration', null);
        let frames = [];
        for(let frame of sc.get(tileAnimation, 'frames', [])){
            let tileId = this.fetchTileId(sc.get(frame, 'tile', null));
            if(null === tileId){
                continue;
            }
            frames.push({
                duration: this.resolveDuration(sc.get(frame, 'duration', null), animationDuration, tilesetDuration),
                tileid: tileId
            });
        }
        if(0 === frames.length){
            return frames;
        }
        if(baseTile === frames[0].tileid){
            return frames;
        }
        return [
            {duration: this.resolveDuration(null, animationDuration, tilesetDuration), tileid: baseTile},
            ...frames
        ];
    }

    /**
     * @param {*} frameDuration
     * @param {*} animationDuration
     * @param {*} tilesetDuration
     * @returns {number}
     */
    resolveDuration(frameDuration, animationDuration, tilesetDuration)
    {
        return Number(frameDuration) || Number(animationDuration) || Number(tilesetDuration)
            || TilesetConst.ANIMATIONS_DEFAULT_DURATION;
    }

    /**
     * @param {Array<Object>} placements
     * @param {number} mergedColumns
     * @returns {Array<Object>}
     */
    remapForMerge(placements, mergedColumns)
    {
        let mergedAnimations = [];
        for(let placement of placements){
            this.appendPlacementAnimations(mergedAnimations, placement, mergedColumns);
        }
        return mergedAnimations;
    }

    /**
     * @param {Array<Object>} mergedAnimations
     * @param {Object} placement
     * @param {number} mergedColumns
     */
    appendPlacementAnimations(mergedAnimations, placement, mergedColumns)
    {
        let tilesetDuration = sc.get(placement.tileset, 'animationsDefaultDuration', null);
        for(let tileAnimation of sc.get(placement.tileset, 'tileAnimations', [])){
            mergedAnimations.push(this.remapAnimation(tileAnimation, placement, mergedColumns, tilesetDuration));
        }
    }

    /**
     * @param {Object} tileAnimation
     * @param {Object} placement
     * @param {number} mergedColumns
     * @param {number|null} tilesetDuration
     * @returns {Object}
     */
    remapAnimation(tileAnimation, placement, mergedColumns, tilesetDuration)
    {
        let animationDuration = sc.get(tileAnimation, 'defaultDuration', null);
        let remappedFrames = [];
        for(let frame of sc.get(tileAnimation, 'frames', [])){
            remappedFrames.push({
                tile: this.remapFlatIndex(frame.tile, placement, mergedColumns),
                duration: this.resolveDuration(sc.get(frame, 'duration', null), animationDuration, tilesetDuration)
            });
        }
        return {
            name: sc.get(tileAnimation, 'name', ''),
            baseTile: this.remapFlatIndex(tileAnimation.baseTile, placement, mergedColumns),
            defaultDuration: null,
            frames: remappedFrames
        };
    }

    /**
     * @param {number} flatIndex
     * @param {Object} placement
     * @param {number} mergedColumns
     * @returns {number}
     */
    remapFlatIndex(flatIndex, placement, mergedColumns)
    {
        let tilesetColumns = Number(sc.get(placement.tileset, 'tilesetColumns', 0));
        if(0 === tilesetColumns){
            return flatIndex;
        }
        return (placement.rowOffset + Math.floor(flatIndex / tilesetColumns)) * mergedColumns
            + placement.colOffset + flatIndex % tilesetColumns;
    }

    /**
     * @param {*} tileId
     * @returns {number|null}
     */
    fetchTileId(tileId)
    {
        if(!sc.isInt(tileId) || 0 > tileId){
            return null;
        }
        return tileId;
    }

    /**
     * @param {Object} tileset
     * @param {Array<number>} annotatedFlatIds
     * @returns {Array<number>}
     */
    collectUsedTileIds(tileset, annotatedFlatIds)
    {
        let usedTileIds = sc.isArray(annotatedFlatIds) ? [...annotatedFlatIds] : [];
        let tilesetColumns = Number(sc.get(tileset, 'tilesetColumns', 0));
        if(0 === tilesetColumns){
            return usedTileIds;
        }
        for(let element of sc.get(tileset, 'elements', [])){
            this.appendElementTileIds(usedTileIds, element, tilesetColumns);
        }
        return usedTileIds;
    }

    /**
     * @param {Array<number>} usedTileIds
     * @param {Object} element
     * @param {number} tilesetColumns
     */
    appendElementTileIds(usedTileIds, element, tilesetColumns)
    {
        for(let layer of sc.get(element, 'layers', [])){
            this.appendLayerTileIds(usedTileIds, layer, tilesetColumns);
        }
    }

    /**
     * @param {Array<number>} usedTileIds
     * @param {Object} layer
     * @param {number} tilesetColumns
     */
    appendLayerTileIds(usedTileIds, layer, tilesetColumns)
    {
        for(let tile of sc.get(layer, 'tiles', [])){
            usedTileIds.push(tile[0] * tilesetColumns + tile[1]);
        }
    }

}

module.exports.TileAnimationsBuilder = TileAnimationsBuilder;
