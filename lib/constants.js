/**
 *
 * Reldens - TilesetConst
 *
 */

module.exports.TilesetConst = {
    PROVIDER_ORDER: ['ollama', 'claude', 'gemini'],
    ELEMENT_TYPE: 'element',
    CLUSTER_TYPE: 'cluster',
    SPOT_TYPE: 'spot',
    GENERATOR_TYPES: {
        COMPOSITE: 'elements-composite-loader',
        MULTIPLE: 'multiple-by-loader',
        MULTIPLE_ASSOC: 'multiple-with-association-by-loader'
    },
    SCALAR_TILE_PROPS: ['groundTile', 'pathTile', 'borderTile'],
    LIST_TILE_PROPS: ['groundTiles', 'randomGroundTiles'],
    POSITIONAL_TILE_PROPS: [
        'surroundingTiles',
        'corners',
        'bordersTiles',
        'borderCornersTiles',
        'borderInnerCornersTiles',
        'mapBorderWallsTiles'
    ],
    SPOT_SURROUNDING_POSITION_TO_NAME: {
        '-1,-1': 'top-left',
        '-1,0': 'top-center',
        '-1,1': 'top-right',
        '0,-1': 'middle-left',
        '0,0': 'middle-center',
        '0,1': 'middle-right',
        '1,-1': 'bottom-left',
        '1,0': 'bottom-center',
        '1,1': 'bottom-right'
    },
    SPOT_CORNER_POSITION_TO_NAME: {
        '-1,-1': 'top-left',
        '-1,1': 'top-right',
        '1,-1': 'bottom-left',
        '1,1': 'bottom-right'
    },
    SPOT_BORDER_SIDE_TO_SURROUNDING_NAME: {
        'top': 'top-center',
        'right': 'middle-right',
        'bottom': 'bottom-center',
        'left': 'middle-left'
    },
    SPOT_SURROUNDING_WANGIDS: {
        '-1,-1': [0, 0, 0, 1, 0, 0, 0, 0],
        '-1,0': [0, 0, 0, 1, 0, 1, 0, 0],
        '-1,1': [0, 0, 0, 0, 0, 1, 0, 0],
        '0,-1': [0, 1, 0, 1, 0, 0, 0, 0],
        '0,0': [0, 1, 0, 1, 0, 1, 0, 1],
        '0,1': [0, 0, 0, 0, 0, 1, 0, 1],
        '1,-1': [0, 1, 0, 0, 0, 0, 0, 0],
        '1,0': [0, 1, 0, 0, 0, 0, 0, 1],
        '1,1': [0, 0, 0, 0, 0, 0, 0, 1]
    },
    SPOT_CORNER_WANGIDS: {
        '-1,-1': [0, 1, 0, 1, 0, 1, 0, 0],
        'top-left': [0, 1, 0, 1, 0, 1, 0, 0],
        '-1,1': [0, 0, 0, 1, 0, 1, 0, 1],
        'top-right': [0, 0, 0, 1, 0, 1, 0, 1],
        '1,-1': [0, 1, 0, 1, 0, 0, 0, 1],
        'bottom-left': [0, 1, 0, 1, 0, 0, 0, 1],
        '1,1': [0, 1, 0, 0, 0, 1, 0, 1],
        'bottom-right': [0, 1, 0, 0, 0, 1, 0, 1]
    },
    MAP_BORDER_WALLS_WANGSET_NAME: 'map-border-inner-walls',
    MAP_BORDER_WALLS_SURROUNDING_POSITIONS: {
        '-1,-1': '0,1',
        '-1,0': '0,0',
        '-1,1': '0,-1',
        '0,0': '-1,0',
        '1,-1': '1,1',
        '1,0': '1,0',
        '1,1': '1,-1'
    },
    MAP_BORDER_WALLS_CORNER_POSITIONS: {
        '0,-1': 'top-right',
        '0,1': 'top-left'
    },
    ANIMATIONS_DEFAULT_DURATION: 200,
    TILESET_SESSIONS_SUB_FOLDER: 'tileset-sessions',
    OUTPUT_ELEMENTS_SUB_FOLDER: 'elements',
    OUTPUT_MERGED_SUB_FOLDER: 'merged',
    OUTPUT_AI_BUFFER_SUB_FOLDER: 'ai-buffer',
    GENERATED_ANNOTATED_SUB_FOLDER: 'annotated-map-images'
};
