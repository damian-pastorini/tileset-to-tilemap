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
    ANIMATIONS_DEFAULT_DURATION: 200,
    TILESET_SESSIONS_SUB_FOLDER: 'tileset-sessions',
    OUTPUT_ELEMENTS_SUB_FOLDER: 'elements',
    OUTPUT_MERGED_SUB_FOLDER: 'merged',
    OUTPUT_AI_BUFFER_SUB_FOLDER: 'ai-buffer',
    GENERATED_ANNOTATED_SUB_FOLDER: 'annotated-map-images'
};
