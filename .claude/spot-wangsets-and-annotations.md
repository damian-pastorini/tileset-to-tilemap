# Spot Wangsets and Tile Annotations

How a ground spot configured in the tileset editor becomes terrain data the tile-map-generator can read. Everything here was verified against the source; each claim names the file and method.

## The three wangsets emitted per spot

`CompositeWangsetBuilder.buildSpotWangsets()` (`lib/composite-wangset-builder.js:117`) emits up to three Tiled terrain sets per spot, in this order:

1. `{normalizedSpotKey}` - the spot ground ring. Built by `appendSpotWangsets()` from `buildSpotGroundTiles(spot, centerTile)` plus `spot.corners`.
2. `{normalizedSpotKey}-inner-walls` - built from `spot.innerWallsTiles` plus `spot.innerWallsCornerTiles`.
3. `{normalizedSpotKey}-outer-walls` - built from `spot.outerWallsTiles` plus `spot.outerWallsCornerTiles`.

Each is skipped when it would be empty: `buildWangset()` returns null when no wangtile survived, and `appendSpotWangsets()` only pushes the non null ones.

## The map border inner walls wangset

The map border walls travel the same channel. `CompositeWangsetBuilder.buildMapBorderWallsWangset()` emits one extra wangset per tileset entry, named `map-border-inner-walls` (`TilesetConst.MAP_BORDER_WALLS_WANGSET_NAME`), and `CompositeBuilder.createTilesetEntry()` appends it next to the spot wangsets. `TilesShortcuts.fromPropertiesMappersList()` in tile-map-generator falls back to `mapWangsetData()` when no properties mapper is registered for a tiles key, so the generator picks the wangset up by name and needs no border specific mapper.

There used to be a bespoke path here: the annotation builder emitted `wall-*` key annotations and a `MapBorderWallsMapper` read them back by name. That whole flow was removed. Border walls and spot walls now differ only in the wangset name.

### The 180 degree rotation

The wall slot names belong to the generator, not to the tileset. `WallsGenerator.determineWallTiles()` writes `sMC` on the row directly below the top border and `sTC` on the row under it, and `InnerWalls.sequences()` caps each horizontal run with `sMR` on its **left** end and `sML` on its right, plus `cTR` and `cTL` on the second row. So a wall block picked in natural reading order has to reach the generator rotated 180 degrees: its top row as the `middle-*` slots, its second row as `top-center` plus the `top-left` and `top-right` corners, columns mirrored.

That rotation is applied once, by `remapWallsPositions()` against two key to key tables in `lib/constants.js`:

- `MAP_BORDER_WALLS_SURROUNDING_POSITIONS` - `-1,-1` to `0,1`, `-1,0` to `0,0`, `-1,1` to `0,-1`, `0,0` to `-1,0`
- `MAP_BORDER_WALLS_CORNER_POSITIONS` - `0,-1` to `top-right`, `0,1` to `top-left`

No new wangid table was introduced: the values still come from `SPOT_SURROUNDING_WANGIDS` and `SPOT_CORNER_WANGIDS`. Only the choice of which existing slot each picked cell feeds is remapped. The admin grid keeps its natural `-1,-1` to `1,1` `data-pos` values, so an existing session stays valid and the tiles are picked in reading order.

`tile-map-generator/tests/test-data/reldens-dungeon-composite.json` shows the same rotation hand authored into its `cave-inner-walls` wangset, where tile 1181, the physically leftmost of its row, carries the `middle-right` wangid. That file is compensating for the generator, not expressing a spot convention: the wangid tables themselves are standard tiled map editor app corner terrain values.

Covered by `tests/unit/test-composite-wangset-builder.js`, group `buildMapBorderWallsWangset`.

### Why the bare ground wangset must exist

`buildSpotGroundTiles()` (`lib/composite-wangset-builder.js:105`) copies `spot.surroundingTiles` and, when the spot has a picked tile, injects it at the center key `0,0`. Without this bare `{normalizedSpotKey}` wangset the generator has no way to resolve the spot ring from the composite alone: `TilesShortcuts.fromPropertiesMappersList()` in tile-map-generator looks up a wangset named exactly `tilesKey`, and if it finds nothing every shortcut slot stays unresolved. A spot whose only wangset is `{key}-inner-walls` therefore renders its borders layer as a plain copy of the spot layer.

## Two position vocabularies, and the collision they used to cause

Spot tile maps do NOT all use the same keys.

- `surroundingTiles`, `corners`, `innerWallsTiles`, `outerWallsTiles`, `innerWallsCornerTiles` and `outerWallsCornerTiles` as saved by the editor use GRID keys: `-1,-1`, `-1,0`, `-1,1`, `0,-1`, `0,0`, `0,1`, `1,-1`, `1,0`, `1,1`.
- `bordersTiles` uses SIDE names: `top`, `right`, `bottom`, `left`.
- `borderCornersTiles` uses CORNER names: `top-left`, `top-right`, `bottom-left`, `bottom-right`.

The grid key to name mappings are shared through `TilesetConst.SPOT_SURROUNDING_POSITION_TO_NAME` and `TilesetConst.SPOT_CORNER_POSITION_TO_NAME` (`lib/constants.js`), and consumed by `CompositeTileAnnotationBuilder` and `CompositeWangsetBuilder`. The side name mapping lives in `CompositeTileAnnotationBuilder.borderSideToSurroundingName`.

Surrounding grid key to position name:

- `-1,-1` is `top-left`
- `-1,0` is `top-center`
- `-1,1` is `top-right`
- `0,-1` is `middle-left`
- `0,0` is `middle-center`
- `0,1` is `middle-right`
- `1,-1` is `bottom-left`
- `1,0` is `bottom-center`
- `1,1` is `bottom-right`

Corner grid key to corner name:

- `-1,-1` is `top-left`
- `-1,1` is `top-right`
- `1,-1` is `bottom-left`
- `1,1` is `bottom-right`

### The corner wangid collision

There are two wangid tables, `TilesetConst.SPOT_SURROUNDING_WANGIDS` keyed by GRID key and `TilesetConst.SPOT_CORNER_WANGIDS` keyed by grid key AND by corner name.

They used to be merged into a single lookup, and `mergeAndBuildWangset()` merged the corner tiles straight into the walls tiles with `Object.assign({}, wallsTiles, cornerTiles)`. Because the editor saves corner tiles under the SAME grid keys the surrounding tiles use, that had two effects, both silent:

- the corner tiles overwrote the surrounding tiles at `-1,-1`, `-1,1`, `1,-1` and `1,1`
- `buildWangtiles()` then looked those keys up in the merged table, found the SURROUNDING wangid, and never emitted a single corner wangid

Downstream that meant `WangsetMapper.mapPositionsFromWangset()` in tile-map-generator never populated `cornersPosition`, so `TilesShortcuts` left `cTL`, `cTR`, `cBL` and `cBR` unresolved for every spot, and no spot could ever get corner tiles or corner driven inner walls.

`buildWangset()` now keeps the two sets apart: it calls `buildWangtiles()` once with the surrounding tiles against `SPOT_SURROUNDING_WANGIDS`, once with the corner tiles against `SPOT_CORNER_WANGIDS`, and concatenates the results. Nothing is merged and nothing is re-keyed, so the collision cannot come back. `SPOT_CORNER_WANGIDS` carries every corner under both its grid key and its corner name, so both saved conventions resolve to the same wangid.

The corner wangid values match `WangsetPositions.cornersWangIds()` in tile-map-generator exactly, which is what makes the round trip work:

- `top-left` is `[0,1,0,1,0,1,0,0]`
- `top-right` is `[0,0,0,1,0,1,0,1]`
- `bottom-left` is `[0,1,0,1,0,0,0,1]`
- `bottom-right` is `[0,1,0,0,0,1,0,1]`

## applyCornersTiles: what sets it and what it gates

`TilesetCompositeConfigBuilder.buildGroundSpotConfig()` (`lib/tileset-composite-config-builder.js:59`) derives it at line 83:

```javascript
applyCornersTiles: 0 < Object.keys(surroundingTiles).length
    || 0 < Object.keys(sc.get(spot, 'corners', {})).length
    || borderOuterWalls
    || borderInnerWalls,
```

It is true when the spot has any surrounding tiles, any corners, or either walls flag. This matters because in the generator `applyCornersTiles` is the master switch: `SpotGenerator.generateSpotWalls()` returns immediately with no walls when it is false, so a spot with `borderInnerWalls: true` but `applyCornersTiles: false` produces NO inner walls layer at all. A config generated before this derivation included the walls flags will carry `applyCornersTiles: false` and must be regenerated.

`splitBordersInLayers` is forced true by the same rule at line 87 whenever either walls flag is set, because the generator only pushes the borders and walls layers when it is true.

Note line 92: `borderInnerWalls: borderInnerWalls || borderOuterWalls`. Outer walls imply inner walls in the emitted config.

## firstgid and why session indexes look shifted

`computeFirstgids()` (`lib/tileset-composite-config-builder.js:21`) assigns each tileset a starting global id, beginning at 1 and advancing by each tileset's `tileCount`. `applyFirstgidToList()` (line 101) then adds that offset to every tile index it writes into the config.

This is why a tile the editor session records as index N appears as N plus the firstgid in `map-generator-config.json`. Both numbers are correct, they just belong to different coordinate spaces: the session stores per tileset local indexes, the generated config stores composite global ids.

## Spot key normalization

`normalizeSpotKey()` exists in both `CompositeWangsetBuilder` (`lib/composite-wangset-builder.js:12`) and `TilesetCompositeConfigBuilder` (`lib/tileset-composite-config-builder.js:51`) and replaces every hyphen with an underscore. A spot the user names `house-room` becomes the key `house_room`, and the wangsets become `house_room`, `house_room-inner-walls` and `house_room-outer-walls`.

The suffixes themselves keep their hyphens, so the normalization applies to the spot name only. The generator looks the wangset up by the exact `tilesKey` in the config, which `buildGroundSpotConfig()` sets to the same normalized key, so the two sides stay in sync as long as both use `normalizeSpotKey()`.
