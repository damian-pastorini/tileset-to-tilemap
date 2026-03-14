/**
 *
 * Reldens - Tests Run
 *
 */

let { Logger } = require('@reldens/utils');
let { TestHelpers } = require('./unit/test-helpers');
let { TestTileBoundsCalculator } = require('./unit/test-tile-bounds-calculator');
let { TestTilePixelAnalyzer } = require('./unit/test-tile-pixel-analyzer');
let { TestMapFormatter } = require('./unit/test-map-formatter');
let { TestClusterNamerPrompts } = require('./unit/test-cluster-namer-prompts');
let { TestClusterNamer } = require('./unit/test-cluster-namer');
let { TestElementBuilder } = require('./unit/test-element-builder');
let { TestCompositeBuilder } = require('./unit/test-composite-builder');
let { TestMultiAiAnalyzer } = require('./unit/test-multi-ai-analyzer');
let { TestAnnotatedImageBuilder } = require('./unit/test-annotated-image-builder');
let { TestMergeTilesetFilter } = require('./unit/test-merge-tileset-filter');
let { TestTilesetsMerge } = require('./unit/test-tilesets-merge');
let { TestTilesetFilesBuilder } = require('./unit/test-tileset-files-builder');
let { TestTilesetImagePersister } = require('./unit/test-tileset-image-persister');
let { TestAiProviderCaller } = require('./unit/test-ai-provider-caller');
let { TestClusterDetector } = require('./unit/test-cluster-detector');
let { TestClusterCropper } = require('./unit/test-cluster-cropper');
let { TestTilesetImageMerger } = require('./unit/test-tileset-image-merger');
let { TestRequirements } = require('./unit/test-requirements');
let { TestTilesetConst } = require('./unit/test-tileset-const');
let { TestRequestParser } = require('./unit/test-request-parser');
let { TestIndexRoute } = require('./unit/test-index-route');
let { TestSessionDeleteRoute } = require('./unit/test-session-delete-route');
let { TestSessionSaveRoute } = require('./unit/test-session-save-route');
let { TestGenerateRoute } = require('./unit/test-generate-route');
let { TestMergeRoute } = require('./unit/test-merge-route');
let { TestAiDetectRoute } = require('./unit/test-ai-detect-route');
let { TestAiNameRoute } = require('./unit/test-ai-name-route');
let { TestAiAssignLayersRoute } = require('./unit/test-ai-assign-layers-route');

let testClasses = [
    TestHelpers,
    TestTileBoundsCalculator,
    TestTilePixelAnalyzer,
    TestMapFormatter,
    TestClusterNamerPrompts,
    TestClusterNamer,
    TestElementBuilder,
    TestCompositeBuilder,
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
