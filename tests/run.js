/**
 *
 * Reldens - Tests Run
 *
 */

const { Logger } = require('@reldens/utils');
const { TestHelpers } = require('./unit/test-helpers');
const { TestTileBoundsCalculator } = require('./unit/test-tile-bounds-calculator');
const { TestTilePixelAnalyzer } = require('./unit/test-tile-pixel-analyzer');
const { TestMapFormatter } = require('./unit/test-map-formatter');
const { TestClusterNamerPrompts } = require('./unit/test-cluster-namer-prompts');
const { TestClusterNamer } = require('./unit/test-cluster-namer');
const { TestElementBuilder } = require('./unit/test-element-builder');
const { TestCompositeBuilder } = require('./unit/test-composite-builder');
const { TestCompositeTileAnnotationBuilder } = require('./unit/test-composite-tile-annotation-builder');
const { TestTileAnimationsBuilder } = require('./unit/test-tile-animations-builder');
const { TestMultiAiAnalyzer } = require('./unit/test-multi-ai-analyzer');
const { TestAnnotatedImageBuilder } = require('./unit/test-annotated-image-builder');
const { TestMergeTilesetFilter } = require('./unit/test-merge-tileset-filter');
const { TestTilesetsMerge } = require('./unit/test-tilesets-merge');
const { TestTilesetFilesBuilder } = require('./unit/test-tileset-files-builder');
const { TestTilesetImagePersister } = require('./unit/test-tileset-image-persister');
const { TestAiProviderCaller } = require('./unit/test-ai-provider-caller');
const { TestClusterDetector } = require('./unit/test-cluster-detector');
const { TestClusterCropper } = require('./unit/test-cluster-cropper');
const { TestTilesetImageMerger } = require('./unit/test-tileset-image-merger');
const { TestRequirements } = require('./unit/test-requirements');
const { TestTilesetConst } = require('./unit/test-tileset-const');
const { TestRequestParser } = require('./unit/test-request-parser');
const { TestIndexRoute } = require('./unit/test-index-route');
const { TestSessionDeleteRoute } = require('./unit/test-session-delete-route');
const { TestSessionSaveRoute } = require('./unit/test-session-save-route');
const { TestGenerateRoute } = require('./unit/test-generate-route');
const { TestMergeRoute } = require('./unit/test-merge-route');
const { TestAiDetectRoute } = require('./unit/test-ai-detect-route');
const { TestAiNameRoute } = require('./unit/test-ai-name-route');
const { TestAiAssignLayersRoute } = require('./unit/test-ai-assign-layers-route');

let testClasses = [
    TestHelpers,
    TestTileBoundsCalculator,
    TestTilePixelAnalyzer,
    TestMapFormatter,
    TestClusterNamerPrompts,
    TestClusterNamer,
    TestElementBuilder,
    TestCompositeBuilder,
    TestCompositeTileAnnotationBuilder,
    TestTileAnimationsBuilder,
    TestMultiAiAnalyzer,
    TestAnnotatedImageBuilder,
    TestMergeTilesetFilter,
    TestTilesetsMerge,
    TestTilesetFilesBuilder,
    TestTilesetImagePersister,
    TestAiProviderCaller,
    TestClusterDetector,
    TestClusterCropper,
    TestTilesetImageMerger,
    TestRequirements,
    TestTilesetConst,
    TestRequestParser,
    TestIndexRoute,
    TestSessionDeleteRoute,
    TestSessionSaveRoute,
    TestGenerateRoute,
    TestMergeRoute,
    TestAiDetectRoute,
    TestAiNameRoute,
    TestAiAssignLayersRoute
];

function getTestMethods(instance)
{
    let methods = [];
    for(
        let proto = Object.getPrototypeOf(instance);
        proto && 'Object' !== proto.constructor.name;
        proto = Object.getPrototypeOf(proto)
    ){
        let names = Object.getOwnPropertyNames(proto);
        for(let name of names){
            if(name.startsWith('test') && 'function' === typeof instance[name] && !methods.includes(name)){
                methods.push(name);
            }
        }
    }
    return methods.sort();
}

async function run()
{
    let total = 0;
    let passed = 0;
    let failed = 0;
    for(let TestClass of testClasses){
        let instance = new TestClass();
        let methods = getTestMethods(instance);
        for(let method of methods){
            await instance[method]();
        }
        let results = instance.runner.getResults();
        total += results.total;
        passed += results.passed;
        failed += results.failed;
    }
    Logger.info('');
    Logger.info('Results: '+total+' total | '+passed+' passed | '+failed+' failed');
    if(failed){
        process.exit(1);
    }
}

run().catch(error => {
    Logger.error('Test run failed: '+error.message);
    process.exit(1);
});
