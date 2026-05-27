# @reldens/tileset-to-tilemap

Node.js library that takes game tileset PNG images, detects individual game objects via pixel analysis, sends each cluster to AI providers for naming and layer assignment, and generates Tiled-compatible JSON files for use with the Reldens game platform.

## Stack

- **Runtime**: Node.js >= 20
- **Image processing**: Sharp (pixel-level analysis, cropping, resizing), image-js (connected component labeling)
- **AI providers**: Claude (`@anthropic-ai/sdk`), Gemini (`@google/genai`), Ollama (local HTTP streaming)
- **Utilities**: `@reldens/utils` (Logger, Shortcuts `sc`), `@reldens/server-utils` (FileHandler)

## Project Rules

- Never use Bash, use Read/Edit/Write tools only
- Follow all code-style skills and rules

## Package Structure

```
index.js                          - exports all classes
lib/
  constants.js                    - TilesetConst (PROVIDER_ORDER, ELEMENT_TYPE, CLUSTER_TYPE)
  helpers.js                      - Helpers (padNum, tileKey, elementName, sanitizeSessionId, calcTileColumns, calcTileRows, resolveEntryTilesetIndex)
  requirements.js                 - AI provider availability checks
  ai-analyzer.js                  - main pipeline orchestrator
  ai-provider-caller.js           - Claude/Gemini/Ollama API calls
  annotated-image-builder.js      - SVG overlay to annotated PNG
  cluster-cropper.js              - crop cluster region with alpha masking
  cluster-detector.js             - connected component detection on tile grid
  cluster-namer.js                - AI response parsing (names + layers)
  cluster-namer-prompts.js        - AI prompt templates
  composite-builder.js            - all elements combined on one Tiled map
  composite-annotation-resolver.js - per-tileset/global tile annotation merge
  element-builder.js              - per-element Tiled JSON
  map-formatter.js                - JSON pretty-printing with inline tile arrays
  merge-tileset-filter.js         - pre-merge validation and preparation
  multi-ai-analyzer.js            - multi-provider fallback orchestration
  tile-bounds-calculator.js       - bounding box from tile array
  tile-options-merger.js          - tile options merging with firstgid resolution
  tile-pixel-analyzer.js          - pixel-level RGB/alpha operations
  tileset-files-builder.js        - output file generation orchestrator
  tileset-image-merger.js         - multi-tileset image composition
  tileset-image-persister.js      - file path management across sessions
  tileset-resizer.js              - scale tilesets via Sharp
  tilesets-merge.js               - merge multiple tilesets into one
tests/
  run.js                          - test runner entry point
```

## Key Constants and Utilities

### `TilesetConst` (`lib/constants.js`)

```javascript
let { TilesetConst } = require('@reldens/tileset-to-tilemap');

// PROVIDER_ORDER is ['ollama', 'claude', 'gemini']
TilesetConst.PROVIDER_ORDER;
// ELEMENT_TYPE is 'element'
TilesetConst.ELEMENT_TYPE;
// CLUSTER_TYPE is 'cluster'
TilesetConst.CLUSTER_TYPE;
```

### `Helpers` (`lib/helpers.js`)

```javascript
let { Helpers } = require('@reldens/tileset-to-tilemap');

// '005'
Helpers.padNum(5);
// '2,3'
Helpers.tileKey([2, 3]);
// 'element-001'
Helpers.elementName(1);
// 'my-session'
Helpers.sanitizeSessionId('my session!');
// 16
Helpers.calcTileColumns(512, 0, 0, 32);
// 8
Helpers.calcTileRows(256, 0, 0, 32);
// returns the tileset position whose filename matches entry.tilesetKey, or entry.tilesetIndex as a legacy fallback
Helpers.resolveEntryTilesetIndex(entry, tilesets);
```

## Data Structures

### Element

```javascript
{
    // kebab-case with 3-digit numeric suffix
    name: 'tree-001',
    // TilesetConst.ELEMENT_TYPE or CLUSTER_TYPE
    type: 'element',
    // false means cluster, not yet reviewed
    approved: true,
    layers: [
        {
            // 'below-player' | 'collisions' | 'over-player' | 'collisions-over-player'
            type: 'collisions',
            // [row, col] pairs
            tiles: [[0, 1], [0, 2]]
        }
    ]
}
```

### Tileset (input to build/persistImages)

```javascript
{
    sessionId: '2026-03-13-10-00-00',
    // filename only
    imageId: 'tileset.png',
    // original filename
    filename: 'tileset.png',
    filePath: '/abs/path/input/sessionId/tileset.png',
    imageUrl: 'tileset-image/sessionId/tileset.png',
    imageWidth: 512,
    imageHeight: 256,
    tileWidth: 32,
    tileHeight: 32,
    spacing: 0,
    margin: 0,
    tilesetColumns: 16,
    tileRows: 8,
    tileCount: 128,
    bgColor: '#ffffff',
    elements: [ /* Element[] */ ]
}
```

### Global tile option entry

Global tile options reference a source tileset by its `filename` via `tilesetKey` for stability across reorders. Legacy entries used the positional `tilesetIndex`, which is still accepted as a fallback.

```javascript
{
    // current shape, stable across tileset reorders
    tilesetKey: 'FW-mainlevbuild-ground.png',
    flatIndex: 64
}
```

## Pipeline

### 1. AI Provider Detection

```javascript
let { Requirements } = require('@reldens/tileset-to-tilemap');

let requirements = new Requirements({
    ollamaHost: 'http://localhost:11434',
    ollamaModel: 'qwen2.5vl:7b',
    ollamaAvailableModels: '',
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    geminiApiKey: process.env.GEMINI_API_KEY
});
// only available providers, e.g. ['ollama:qwen2.5vl:7b', 'claude', 'gemini']
let providers = await requirements.resolveAiProviders();
```

### 2. Full Image Analysis

```javascript
let { AiAnalyzer, Helpers } = require('@reldens/tileset-to-tilemap');
const sharp = require('sharp');
const { Logger } = require('@reldens/utils');

let imageBuffer = await sharp('/path/to/tileset.png').png().toBuffer();
let meta = await sharp('/path/to/tileset.png').metadata();

let tileWidth = 32;
let tileHeight = 32;
let margin = 0;
let spacing = 0;
let tilesetColumns = Helpers.calcTileColumns(meta.width, margin, spacing, tileWidth);
let tileRows = Helpers.calcTileRows(meta.height, margin, spacing, tileHeight);

let analyzer = new AiAnalyzer({
    claudeModel: 'claude-sonnet-4-6',
    claudeMaxTokens: 512,
    claudeMaxTokensDetection: 4096,
    geminiModel: 'gemini-2.0-flash-preview-image-generation',
    ollamaHost: 'http://localhost:11434',
    ollamaNumCtx: 8192,
    ollamaNumPredict: 2000,
    skipAi: false,
    validatePass: false
});

// result is { elements: Element[], filteredTiles: [[row, col], ...] }
let result = await analyzer.analyzeImage({
    imageBuffer,
    tilesetColumns,
    tileRows,
    tileWidth,
    tileHeight,
    margin,
    spacing,
    // from Requirements.resolveAiProviders()
    providers,
    // bgColor hex
    bgColorHex: '#ffffff',
    // onToken callback
    onToken: (tokenCount) => Logger.info('tokens: '+tokenCount),
    // onProgress callback
    onProgress: (info) => Logger.info('progress: '+JSON.stringify(info)),
    // optional path to save cropped clusters
    debugDir: null
});
```

### 3. Cluster Detection Only (no AI)

```javascript
let { ClusterDetector } = require('@reldens/tileset-to-tilemap');

let detector = new ClusterDetector({
    minClusterTiles: 1,
    clusterColorDistance: 30,
    clusterVarianceThreshold: 600,
    clusterMinTileFillPct: 10,
    clusterSplitByGap: 1,
    elementBorderColorDistance: 20
});
// detected is { elements: [], clusters: [{ tiles, minRow, maxRow, minCol, maxCol }], filteredTiles: [] }
let detected = await detector.detect({
    imageBuffer,
    tilesetColumns,
    tileRows,
    tileWidth,
    tileHeight,
    margin,
    spacing,
    bgColorHex: '#ffffff'
});
```

### 4. Crop a Cluster Region

```javascript
let { ClusterCropper } = require('@reldens/tileset-to-tilemap');

let cropper = new ClusterCropper();
// cluster shape is { tiles: [[row,col],...], minRow, maxRow, minCol, maxCol }
// cropResult is { buffer: Buffer, relativeTiles: [[row,col],...], cropRows: N, cropCols: N }
let cropResult = await cropper.crop(
    imageBuffer,
    cluster,
    tileWidth,
    tileHeight,
    margin,
    spacing,
    '#ffffff'
);
```

### 5. AI Naming Only

```javascript
let { ClusterNamer } = require('@reldens/tileset-to-tilemap');

let namer = new ClusterNamer();
// name is 'tree-001' or null
let name = await namer.nameOnly(provider, cropResult.buffer, null);
```

### 6. AI Layer Assignment Only

```javascript
// layers is [{ type: 'collisions', tiles: [[0,0],[0,1]] }, ...]
let layers = await namer.assignLayers(
    provider,
    cropResult.buffer,
    cropResult.relativeTiles,
    cropResult.cropRows,
    cropResult.cropCols,
    null
);
```

### 7. Multi-Provider Fallback Naming

```javascript
let { MultiAiAnalyzer, ClusterCropper } = require('@reldens/tileset-to-tilemap');

let cropper = new ClusterCropper();
let cropResult = await cropper.crop(imageBuffer, cluster, tileWidth, tileHeight, margin, spacing, bgColor);

let multiAi = new MultiAiAnalyzer();
// result is { name: 'tree-001', layers: [{ type, tiles }] }
let result = await multiAi.nameElement(
    cropResult.buffer,
    cropResult.relativeTiles,
    cropResult.cropRows,
    cropResult.cropCols,
    // tries each in order, first valid result wins
    providers,
    // elementIndex for fallback name generation
    0,
    // onToken
    null,
    // validatePass: run verify step after naming
    false
);

// Deduplicate names after processing multiple elements.
// Renames collisions: ['tree-001', 'tree-001'] becomes ['tree-001', 'tree-002'].
let deduped = multiAi.deduplicateNames(elements);
```

### 8. Per-Element AI Operations (via AiAnalyzer)

```javascript
// params is { sessionId, imageId, provider, tileWidth, tileHeight, spacing, margin, bgColor }
let elements = await analyzer.detectClusterElements(imageBuffer, clusterTiles, params);

// Assign layers for a known element's tiles.
let layers = await analyzer.assignLayersAbsolute(imageBuffer, elementTiles, params);
```

### 9. File Persistence

```javascript
let { TilesetImagePersister } = require('@reldens/tileset-to-tilemap');

// rootDir: absolute path to 'generated-tile-map-elements'
// outputDir: rootDir/output/sessionId
// tilesets: mutates filePath, imageUrl, sessionId on each
// oldInputDir / newInputDir / oldSessionId: pass '' when not renaming
TilesetImagePersister.persistImages(
    rootDir,
    outputDir,
    sessionId,
    tilesets,
    oldInputDir,
    newInputDir,
    oldSessionId
);

// imageId is the filename. Checks input/ then output/.
let imageBuffer = await TilesetImagePersister.loadImageBuffer(sessionId, imageId, rootDir);

// Update cropped paths after a session rename.
let updated = TilesetImagePersister.updateCroppedPaths(
    croppedElementsPaths,
    oldSessionId,
    newSessionId
);
```

### 10. Output File Generation

```javascript
let { TilesetFilesBuilder } = require('@reldens/tileset-to-tilemap');

let builder = new TilesetFilesBuilder();
// rootDir: absolute path to 'generated-tile-map-elements'
// outputDir: rootDir/output/sessionId
// tilesets: tilesets with elements to generate files for
// fullTilesets: all tilesets used for the composite, may include unselected
// files: [{ name, downloadUrl, type: 'output'|'input' }]
let files = await builder.build(
    rootDir,
    sessionId,
    outputDir,
    tilesets,
    fullTilesets,
    mapName,
    mapTitle
);
```

### 11. Tileset Merge

```javascript
let { TilesetsMerge } = require('@reldens/tileset-to-tilemap');
const { Logger } = require('@reldens/utils');

let merger = new TilesetsMerge();
// tilesetsMergeData: array of tileset objects from session state
// result: { mergedTileset, stateIndices } or { error: string }
let result = await merger.run(
    sessionId,
    tilesetsMergeData,
    outputDir,
    (message) => Logger.info(message)
);
```

### 12. Tileset Resize

```javascript
let { TilesetResizer } = require('@reldens/tileset-to-tilemap');

let resizer = new TilesetResizer();
// targetTileSize: e.g. 16 to downscale 32px tiles to 16px
// result: { tileWidth, tileHeight } or null on failure
let result = await resizer.resize(
    inputPath,
    originalTileWidth,
    originalTileHeight,
    targetTileSize,
    outputPath
);
```

## Output Files

All saved to `generated-tile-map-elements/output/{sessionId}/`:

- `session-editor-state.json`: full tileset+element state (used by Load session).
- `elements-config.json`: same state formatted for readability.
- `{tileset-name}.png`: copy of original tileset PNG.
- `{tileset-name}-{element-name}.json`: per-element Tiled-format map.
- `{tileset-name}-annotated.png`: tileset with element overlays and grid.
- `composite.json`: all elements on one Tiled map.
- `map-generator-config.json`: Reldens map generator config.

Input files stored in `generated-tile-map-elements/input/{sessionId}/`.

## Constructor Options

The package reads no `process.env` directly. All configuration is passed via constructor options. API keys for Claude and Gemini are read by their respective SDKs from `ANTHROPIC_API_KEY` / `GEMINI_API_KEY` env vars automatically.

### `Requirements(options)`
- `ollamaHost`: default `'http://localhost:11434'`.
- `ollamaModel`: default `'qwen2.5vl:7b'`.
- `ollamaAvailableModels`: comma-separated string or array, default `''`.
- `anthropicApiKey`: used to detect Claude availability.
- `geminiApiKey`: used to detect Gemini availability.

### `AiProviderCaller(options)` / `AiAnalyzer(options)` / `MultiAiAnalyzer(options)`
- `claudeModel`: default `'claude-sonnet-4-6'`.
- `claudeMaxTokens`: default `512`.
- `claudeMaxTokensDetection`: default `4096`.
- `geminiModel`: default `'gemini-2.0-flash-preview-image-generation'`.
- `geminiMaxTokens`: default `512`.
- `geminiMaxTokensDetection`: default `4096`.
- `ollamaHost`: default `'http://localhost:11434'`.
- `ollamaNumCtx`: default `8192`.
- `ollamaNumPredict`: default `2000`.
- `skipAi`: default `false`.
- `validatePass`: default `false`.

### `ClusterDetector(options)` / `ClusterCropper(options)`
- `minClusterTiles`: discard clusters smaller than this, default `1`.
- `clusterEmptyAlphaThreshold`: alpha below this is treated as transparent, default `10`.
- `clusterColorDistance`: RGB distance from bgColor treated as background, default `30`.
- `clusterVarianceThreshold`: exclude low-variance tiles, default `600`.
- `clusterMinTileFillPct`: minimum percentage of tile pixels that must be non-background, default `10`.
- `clusterSplitByGap`: split clusters at internal empty tile rows/cols, default `1`.
- `elementBorderColorDistance`: max color distance between adjacent tile edges for single-element classification, default `20`.

### `TilesetAnalyzerServer(rootDir, options)`
- `publicDir`: path to static files dir, default `'public'`.
- `showAiControls`: show manual AI buttons in UI, default `false`.
- `aiProviders`: array of provider strings, default `[]`.
- `skipAi`: disable AI analysis, default `false`.
- `skipIndex`: skip registering `GET /` (for admin embed), default `false`.
- All `AiAnalyzer` / `ClusterDetector` options are also accepted and passed through.
