# Tile Animations: Session State to Tiled Output

This document covers how animated tiles travel from the tileset editor session state into the composite JSON, and
from there into the optimized tileset and the final generated map. Animations are a per tileset feature: every
animation belongs to one tileset and is expressed with tileset local flat indexes, never with global ids.

---

## Session Shape

Each tileset entry of the editor session state (`session-editor-state.json`, and the same object posted to the
generate endpoint) carries two animation keys:

```json
{
  "animationsDefaultDuration": 200,
  "tileAnimations": [
    {
      "name": "water-flow",
      "baseTile": 242,
      "defaultDuration": null,
      "frames": [
        { "tile": 242, "duration": null },
        { "tile": 244, "duration": 300 }
      ]
    }
  ]
}
```

- `animationsDefaultDuration` is the tileset wide fallback duration in milliseconds.
- `tileAnimations` is an array of animations. `name` is a free label used only by the editor UI.
- `baseTile` is the tile the animation is attached to. In Tiled terms it becomes the animated tile id, so the
  static map cell that references this tile is the cell that will animate.
- `frames` is the ordered frame list. Each frame has its own `tile` and an optional `duration`.

All tile values (`baseTile` and `frames[].tile`) are flat indexes, tileset local and zero based:
`flatIndex = row * tilesetColumns + col`. This is the exact same value the tile options pick handler produces, so
an animation frame and a tile role annotation can be compared directly. The values MUST be stored as numbers:
`TileAnimationsBuilder.fetchTileId()` validates them with `sc.isInt()` and silently drops anything else, which is
how a string coming from a form input ends up producing no animation at all.

---

## Duration Precedence

`TileAnimationsBuilder.resolveDuration()` resolves the duration of every emitted frame in this order:

1. the frame `duration`,
2. the animation `defaultDuration`,
3. the tileset `animationsDefaultDuration`,
4. `TilesetConst.ANIMATIONS_DEFAULT_DURATION` (200), defined in `lib/constants.js`.

The resolution is numeric and falsy driven (`Number(value) || next`), so `null`, `0`, an empty string and any non
numeric value all fall through to the next level. There is no way to emit a zero duration frame, which is
intentional because Tiled treats a zero duration frame as a stuck animation.

Every emitted frame always carries an explicit numeric `duration`. Nothing downstream needs to know about the
fallback chain: the chain is fully resolved at build time.

---

## Used Tiles Only Emission

`TileAnimationsBuilder.build(tileset, annotatedFlatIds)` emits an animation entry only when its `baseTile` is part
of the tiles the tileset actually uses. The used set is the union of:

- `annotatedFlatIds`, the flat indexes collected by `CompositeTileAnnotationBuilder.collectAnnotatedFlatIds()` from
  the tile options (ground, path, surroundings, corners, borders) and from every spot (spot tile, surroundings,
  corners, inner and outer walls),
- every tile of every layer of every element of the tileset, computed as `tile[0] * tilesetColumns + tile[1]` from
  the element layer tile pairs.

An animation whose base tile is not in that union is dropped. The reason is the optimizer: the optimized tileset
image only contains used tiles, and an animation on an unused base tile would force that tile plus all of its
frames into the packed image for nothing. Frames themselves are NOT filtered, a used base tile pulls its frames
into the optimized sheet even when those frames are not used anywhere else (see the optimizer section below).

Consequence for the user: assigning an animation is not enough, the base tile has to be used by an element, a spot
or a tile option to reach the generated map.

---

## Tiled Output Shape

`TileAnimationsBuilder.build()` returns Tiled tile entries:

```json
{ "id": 242, "animation": [ { "duration": 200, "tileid": 242 }, { "duration": 300, "tileid": 244 } ] }
```

`id` and `tileid` are tileset local ids, which for the composite equal the flat index, so no conversion happens
between the session and the composite. This matches the format of a hand made Tiled map, for example the entries
found in `theme/default/assets/maps/reldens-town.json` of the Reldens project.

When `frames[0]` is not the base tile, the builder prepends the base tile as the first frame using the same
duration precedence. Tiled requires the animated tile to be the first frame of its own animation, otherwise the
first painted frame flickers into a different tile.

`CompositeTileAnnotationBuilder.buildTileAnnotations(tileOptions, spots, tileset)` builds the animation entries
first, then builds the role annotations, then merges both by tile id in `mergeDuplicateTileAnnotations()`:

- a tile that has roles and an animation ends as one entry with both `properties` and `animation`,
- a tile that has an animation but no role gets an entry with only `animation` (the empty `properties` array is
  removed by `cleanEmptyProperties()`, since Tiled rejects an empty properties array),
- the animation key is carried through the merge, it is never rebuilt from the role entries.

`CompositeBuilder.createTilesetEntry()` calls `buildTileAnnotations(effectiveTileOptions || null, tileset.spots,
tileset)`, so the tileset object itself has to reach the annotation builder: that is where `tileAnimations`,
`animationsDefaultDuration`, `tilesetColumns` and `elements` are read from.

---

## Merge Remap

When several tilesets are merged into one image, the animations have to follow the new tile grid.
`TilesetsMerge.run()` calls `TileAnimationsBuilder.remapForMerge(placements, mergedColumns)`, where each placement
carries the source `tileset` plus its `rowOffset` and `colOffset` inside the merged sheet.

`remapFlatIndex()` converts a source flat index into the merged one:

`(rowOffset + Math.floor(flatIndex / tilesetColumns)) * mergedColumns + colOffset + flatIndex % tilesetColumns`

When the source `tilesetColumns` is unknown (zero) the index is returned untouched, which keeps a malformed
placement from producing a wrong tile instead of a visible failure.

`remapForMerge()` returns session shaped animations, not Tiled entries: the merged tileset state is a session
tileset, so it keeps `name`, `baseTile`, `defaultDuration` and `frames` with `tile` and `duration`. Every frame
duration is baked into an explicit number during the remap and `defaultDuration` is set to `null`, because the
per tileset defaults of the source tilesets no longer apply to the merged one. The merged state written by
`buildMergedTilesetState()` carries `animationsDefaultDuration` (the constant) and `tileAnimations` (the remapped
list), so a merged tileset behaves exactly like an uploaded one from that point on.

---

## Downstream: Optimizer and Generator

Neither `@reldens/tile-map-optimizer` nor `@reldens/tile-map-generator` needed changes for animations, they already
carry them:

`TileMapOptimizer.parseJSON()` walks `tileset.tiles` and, for every entry with an `animation`, force adds the base
tile gid and every frame gid to `mappedOldToNewTiles`. This is what guarantees that a frame which is not painted on
any layer is still packed into the optimized tileset image instead of being stripped as unused.

`TileMapOptimizer.createNewJSON()` rewrites both ids while repacking: the entry `id` becomes
`newImagesPosition - 1` and each frame becomes `{duration, tileid: newImagesPositions[tileset.first +
frame.tileid] - 1}`, so durations are copied verbatim and the frame ids follow the tiles into their new positions.
Entries whose tile did not make it into the packed sheet are skipped together with their animation.

`MapDataMapper` assigns `result.tiles = optimizedTileset.tiles`, `RandomMapGenerator` keeps that array and emits it
in the tileset entry of the final map JSON. The animations therefore reach the generated map with the optimized
tileset local ids, ready for the Phaser client to animate them.
