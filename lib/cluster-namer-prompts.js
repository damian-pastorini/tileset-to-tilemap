/**
 *
 * Reldens - ClusterNamerPrompts
 *
 */

class ClusterNamerPrompts
{
    layerCodesBlock()
    {
        return 'O = over-player: tree canopy, roof top, awning - drawn ABOVE the player sprite\n'
            +'C = collisions: trunk, rock, wall, barrel, chest - solid, player CANNOT walk through\n'
            +'B = below-player: low decoration player walks over - flower patch, mat, shadow\n'
            +'X = collisions-over-player: solid wall section that also renders above player\n';
    }

    layerLinesOutputFormat()
    {
        return 'OUTPUT FORMAT - output ONLY the layer lines, nothing else:\n'
            +'O:row,col row,col\n'
            +'C:row,col row,col\n'
            +'\n'
            +'Zero explanation. Output only the layer lines.';
    }

    buildNamePrompt()
    {
        return 'This image shows a single game element cropped from a tileset.\n'
            +'If this is a recognizable game object (tree, rock, barrel, chest, wall, building, etc.):\n'
            +'Reply with only its kebab-case name followed by a 3-digit number, e.g.: tree-001\n'
            +'\n'
            +'If this is NOT a recognizable game object (empty space, flat terrain, texture pattern):\n'
            +'Reply with exactly: skip\n'
            +'\n'
            +'Reply with only the name or "skip". Zero explanation.';
    }

    buildElementsDetectionPrompt(cropCols, cropRows)
    {
        return 'Game tileset crop: '+cropCols+' columns x '+cropRows+' rows of tiles.\n'
            +'\n'
            +'COORDINATE SYSTEM:\n'
            +'- row = vertical tile index: row 0 is TOP, increases downward\n'
            +'- col = horizontal tile index: col 0 is LEFT, increases rightward\n'
            +'- top-left tile = (row=0, col=0)\n'
            +'\n'
            +'FIND DISTINCT GAME OBJECTS such as:\n'
            +'trees (canopy + trunk), bushes, rocks, boulders, barrels, crates, chests,\n'
            +'boxes, bags, signs, notice boards, fences, gates, walls, pillars,\n'
            +'buildings, houses, roofs, tents, campfires, torches, lanterns,\n'
            +'tables, chairs, benches, wells, carts, wagons, stumps\n'
            +'\n'
            +'SKIP entirely - do NOT include:\n'
            +'- Empty, transparent, or black tiles\n'
            +'- Ground textures: grass, dirt, sand, gravel, stone floor, path tiles\n'
            +'- Water, mud, or flat terrain\n'
            +'- Any tile that is a flat repeating pattern with no 3D object\n'
            +'\n'
            +'BOUNDARY DETECTION:\n'
            +'- Empty or transparent space between tiles means the element HAS ENDED\n'
            +'- Every tile in one element must share a full edge with another tile in that element\n'
            +'- Tiles connected only diagonally are NOT the same element\n'
            +'- When two different objects sit next to each other, make them SEPARATE elements\n'
            +'\n'
            +'LAYER ASSIGNMENT CODES (use EXACTLY these letters before the colon):\n'
            +this.layerCodesBlock()
            +'\n'
            +'VISUAL ANALYSIS RULES - look at each tile carefully:\n'
            +'- FULLY FILLED tile (solid color or heavy texture, no transparency): C or X\n'
            +'  - Bottom row of the element -> C (ground-level collision)\n'
            +'  - Above bottom row and still solid -> X (solid above player)\n'
            +'- PARTIALLY FILLED tile (transparent edges, sparse pixels, foliage outline): O\n'
            +'  - Light canopy, leaf clusters, thin branches with gaps -> O\n'
            +'- SHADOW or MAT at very bottom with no height: B\n'
            +'\n'
            +'OUTPUT FORMAT - output ONLY the element blocks below, nothing else:\n'
            +'elementname\n'
            +'O:row,col row,col\n'
            +'C:row,col row,col\n'
            +'\n'
            +'EXAMPLE OUTPUT:\n'
            +'tree-001\n'
            +'O:0,0 0,1 0,2\n'
            +'C:1,0 1,1 1,2 2,0 2,1 2,2\n'
            +'\n'
            +'rock-002\n'
            +'C:3,0 3,1 4,0 4,1\n'
            +'\n'
            +'RULES:\n'
            +'- elementname: lowercase words joined by dashes + dash + 3 digits (tree-001, ancient-tree-002)\n'
            +'- Layer prefix must be exactly one letter: O, C, B, or X followed by colon\n'
            +'- NEVER output coordinates for empty, transparent or terrain tiles\n'
            +'- Each connected group forming ONE recognizable object = ONE element entry\n'
            +'- No tile coordinate may appear in more than one element\n'
            +'- Blank line between element blocks\n'
            +'- Maximum 20 elements total\n'
            +'- Output ONLY the element blocks. Zero explanation. Zero preamble. Nothing else.';
    }

    buildLayersVerificationPrompt(layers, relativeTiles, cropRows, cropCols)
    {
        let layerLines = layers.map(l => l.code+':'+l.tiles.map(t => t[0]+','+t[1]).join(' ')).join('\n');
        let tileList = relativeTiles.map(t => t[0]+','+t[1]).join(' ');
        return 'This image shows a game element in a '+cropCols+'x'+cropRows+' tile area.\n'
            +'Current layer assignment:\n'
            +layerLines+'\n'
            +'\n'
            +'All tiles present: '+tileList+'\n'
            +'\n'
            +'Verify and correct the layer assignments using visual fill analysis:\n'
            +'- FULLY FILLED tile (solid, no transparency): C at base row, X above base row\n'
            +'- PARTIALLY FILLED tile (sparse, foliage, transparent edges): O\n'
            +'- SHADOW or MAT at very bottom: B\n'
            +'\n'
            +'RULES:\n'
            +'- Every tile in the list must appear in exactly one layer line.\n'
            +'- Do NOT add or remove tile coordinates.\n'
            +'- Layer prefix must be exactly one letter O, C, B, or X followed by colon.\n'
            +'\n'
            +this.layerLinesOutputFormat();
    }

    buildLayersDetectionPrompt(relativeTiles, cropRows, cropCols)
    {
        let tileList = relativeTiles.map(t => t[0]+','+t[1]).join(' ');
        let maxRow = 0;
        for(let t of relativeTiles){
            if(t[0] > maxRow){ maxRow = t[0]; }
        }
        let bottomRowTiles = relativeTiles.filter(t => t[0] === maxRow).map(t => t[0]+','+t[1]).join(' ');
        return 'This image shows a single game element in a '+cropCols+' col x '+cropRows+' row tile grid.\n'
            +'Tile positions present (row,col, top-left = 0,0):\n'
            +tileList+'\n'
            +'\n'
            +'MANDATORY - the bottom row is row '+maxRow+'. These tiles MUST be assigned C:\n'
            +'C:'+bottomRowTiles+'\n'
            +'\n'
            +'Assign ALL remaining tiles (rows 0 to '+(maxRow - 1)+') to exactly one code:\n'
            +'O = over-player, NO collision: ONLY for organic overhead (tree canopy, hanging leaves)\n'
            +'    where the player physically walks on ground directly below.\n'
            +'    DO NOT use O for buildings, walls, fences, rocks, or any solid structure.\n'
            +'X = collision-over-player: solid AND above player height.\n'
            +'    Use for everything else solid: upper walls, roof, upper trunk, upper fence.\n'
            +'    DEFAULT: when unsure between O and X, always choose X.\n'
            +'B = below-player: flat ground decoration only (shadow, mat).\n'
            +'\n'
            +'EXAMPLES:\n'
            +'Building (5 cols x 4 rows, bottom row = 3):\n'
            +'X:0,0 0,1 0,2 0,3 0,4 1,0 1,1 1,2 1,3 1,4 2,0 2,1 2,2 2,3 2,4\n'
            +'C:3,0 3,1 3,2 3,3 3,4\n'
            +'\n'
            +'Tree (3 cols x 4 rows, bottom row = 3):\n'
            +'O:0,0 0,1 0,2 1,0 1,2\n'
            +'X:1,1 2,0 2,1 2,2\n'
            +'C:3,1\n'
            +'\n'
            +'STRICT RULES:\n'
            +'- The tile coordinates are FIXED. Do NOT add or change any coordinates.\n'
            +'- Every listed tile MUST appear exactly once in the output.\n'
            +'- Layer prefix must be exactly one letter (O, C, B, or X) followed by colon.\n'
            +'\n'
            +this.layerLinesOutputFormat();
    }
}

module.exports.ClusterNamerPrompts = ClusterNamerPrompts;
