# @reldens/tileset-to-tilemap

Node.js library that takes game tileset PNG images, detects individual game objects via pixel analysis, sends each cluster to AI providers for naming and layer assignment, and generates Tiled-compatible JSON files for use with the Reldens game platform.

## Stack

- **Runtime**: Node.js >= 20
- **Image processing**: Sharp (pixel-level analysis, cropping, resizing), image-js (connected component labeling)
- **AI providers**: Claude (`@anthropic-ai/sdk`), Gemini (`@google/genai`), Ollama (local HTTP streaming)
- **Utilities**: `@reldens/utils` (Logger, Shortcuts `sc`), `@reldens/server-utils` (FileHandler)

## Project Rules

- Never use Bash — use Read/Edit/Write tools only
- Follow all code-style skills and rules

## Package Structure

```
index.js                          — exports all classes
lib/
  requirements.js                 — AI provider availability checks
  ai-analyzer.js                  — main pipeline orchestrator
  ai-provider-caller.js           — Claude/Gemini/Ollama API calls
  annotated-image-builder.js      — SVG overlay → annotated PNG
  cluster-cropper.js              — crop cluster region with alpha masking
  cluster-detector.js             — connected component detection on tile grid
  cluster-namer.js                — AI response parsing (names + layers)
  cluster-namer-prompts.js        — AI prompt templates
  composite-builder.js            — all elements combined on one Tiled map
  element-builder.js              — per-element Tiled JSON
  map-formatter.js                — JSON pretty-printing with inline tile arrays
  merge-tileset-filter.js         — pre-merge validation and preparation
  multi-ai-analyzer.js            — multi-provider fallback orchestration
  tile-bounds-calculator.js       — bounding box from tile array
  tile-pixel-analyzer.js          — pixel-level RGB/alpha operations
  tileset-files-builder.js        — output file generation orchestrator
  tileset-image-merger.js         — multi-tileset image composition
  tileset-image-persister.js      — file path management across sessions
  tileset-resizer.js              — scale tilesets via Sharp
  tilesets-merge.js               — merge multiple tilesets into one
  utils/
    constants.js                  — TilesetConst (PROVIDER_ORDER, ELEMENT_TYPE, CLUSTER_TYPE)
    helpers.js                    — Helpers (padNum, tileKey, elementName, sanitizeSessionId, calcTileColumns, calcTileRows)
tests/
  run.js                          — test runner entry point
```

## Key Constants and Utilities

### `TilesetConst` (`lib/utils/constants.js`)

```javascript
let { TilesetConst } = require('@reldens/tileset-to-tilemap');

TilesetConst.PROVIDER_ORDER  // ['ollama', 'claude', 'gemini']
TilesetConst.ELEMENT_TYPE    // 'element'
TilesetConst.CLUSTER_TYPE    // 'cluster'
```

### `Helpers` (`lib/utils/helpers.js`)

```javascript
let { Helpers } = require('@reldens/tileset-to-tilemap');

Helpers.padNum(5)                        // '005'
Helpers.tileKey([2, 3])                  // '2,3'
Helpers.elementName(1)                   // 'element-001'
Helpers.sanitizeSessionId('my session!') // 'my-session'
Helpers.calcTileColumns(512, 0, 0, 32)  // 16
Helpers.calcTileRows(256, 0, 0, 32)     // 8
```

## Data Structures

### Element

```javascript
{
    name: 'tree-001',          // kebab-case with 3-digit numeric suffix
    type: 'element',           // TilesetConst.ELEMENT_TYPE or CLUSTER_TYPE
    approved: true,            // false = cluster, not yet reviewed
    layers: [
        {
            type: 'collisions',   // 'below-player' | 'collisions' | 'over-player' | 'collisions-over-player'
            tiles: [[0, 1], [0, 2]]  // [row, col] pairs
        }
    ]
}
```

### Tileset (input to build/persistImages)

```javascript
{
    sessionId: '2026-03-13-10-00-00',
    imageId: 'tileset.png',           // filename only
    filename: 'tileset.png',          // original filename
    filePath: '/abs/path/input/sessionId/tileset.png',
    imageUrl: '/tileset-image/sessionId/tileset.png',
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

## Pipeline

### 1. AI Provider Detection

```javascript
let { Requirements } = require('@reldens/tileset-to-tilemap');

let requirements = new Requirements();
let providers = await requirements.resolveAiProviders();
// providers = ['ollama:qwen2.5vl:7b', 'claude', 'gemini'] — only available ones
```

### 2. Full Image Analysis

```javascript
let { AiAnalyzer, Helpers } = require('@reldens/tileset-to-tilemap');
const sharp = require('sharp');

let imageBuffer = await sharp('/path/to/tileset.png').png().toBuffer();
let meta = await sharp('/path/to/tileset.png').metadata();

let tileWidth = 32;
let tileHeight = 32;
let margin = 0;
let spacing = 0;
let tilesetColumns = Helpers.calcTileColumns(meta.width, margin, spacing, tileWidth);
let tileRows = Helpers.calcTileRows(meta.height, margin, spacing, tileHeight);

let analyzer = new AiAnalyzer();
let result = await analyzer.analyzeImage(
    imageBuffer,
    tilesetColumns,
    tileRows,
    tileWidth,
    tileHeight,
    margin,
    spacing,
    providers,      // from Requirements.resolveAiProviders()
    '#ffffff',      // bgColor hex
    (tokenCount) => console.log('tokens:', tokenCount),   // onToken callback
    (info) => console.log('progress:', info),              // onProgress callback
    null            // debugDir (optional path to save cropped clusters)
);
// result = { elements: Element[], filteredTiles: [[row, col], ...] }
```

### 3. Cluster Detection Only (no AI)

```javascript
let { ClusterDetector } = require('@reldens/tileset-to-tilemap');

let detector = new ClusterDetector();
let detected = await detector.detect(
    imageBuffer,
    tilesetColumns,
    tileRows,
    tileWidth,
    tileHeight,
    margin,
    spacing,
    '#ffffff'
);
// detected = { elements: [], clusters: [{ tiles, minRow, maxRow, minCol, maxCol }], filteredTiles: [] }
```

### 4. Crop a Cluster Region

```javascript
let { ClusterCropper } = require('@reldens/tileset-to-tilemap');

let cropper = new ClusterCropper();
let cropResult = await cropper.crop(
    imageBuffer,
    cluster,      // { tiles: [[row,col],...], minRow, maxRow, minCol, maxCol }
    tileWidth,
    tileHeight,
    margin,
    spacing,
    '#ffffff'
);
// cropResult = { buffer: Buffer, relativeTiles: [[row,col],...], cropRows: N, cropCols: N }
```

### 5. AI Naming Only

```javascript
let { ClusterNamer } = require('@reldens/tileset-to-tilemap');

let namer = new ClusterNamer();
let name = await namer.nameOnly(provider, cropResult.buffer, null);
// name = 'tree-001' or null
```

### 6. AI Layer Assignment Only

```javascript
let layers = await namer.assignLayers(
    provider,
    cropResult.buffer,
    cropResult.relativeTiles,
    cropResult.cropRows,
    cropResult.cropCols,
    null  // onToken
);
// layers = [{ type: 'collisions', tiles: [[0,0],[0,1]] }, ...]
```

### 7. Multi-Provider Fallback Naming

```javascript
let { MultiAiAnalyzer, ClusterCropper, ClusterNamer } = require('@reldens/tileset-to-tilemap');

let cropper = new ClusterCropper();
let cropResult = await cropper.crop(imageBuffer, cluster, tileWidth, tileHeight, margin, spacing, bgColor);

let multiAi = new MultiAiAnalyzer();
let result = await multiAi.nameElement(
    cropResult.buffer,
    cropResult.relativeTiles,
    cropResult.cropRows,
    cropResult.cropCols,
    providers,       // tries each in order, first valid result wins
    0,               // elementIndex (for fallback name generation)
    null,            // onToken
    false            // validatePass (run verify step after naming)
);
// result = { name: 'tree-001', layers: [{ type, tiles }] }

// Deduplicate names after processing multiple elements
let deduped = multiAi.deduplicateNames(elements);
// renames collisions: tree-001, tree-001 → tree-001, tree-002
```

### 8. Per-Element AI Operations (via AiAnalyzer)

```javascript
// Detect sub-elements within a known cluster
let elements = await analyzer.detectClusterElements(imageBuffer, clusterTiles, params);
// params = { sessionId, imageId, provider, tileWidth, tileHeight, spacing, margin, bgColor }

// Assign layers for a known element's tiles
let layers = await analyzer.assignLayersAbsolute(imageBuffer, elementTiles, params);
```

### 9. File Persistence

```javascript
let { TilesetImagePersister } = require('@reldens/tileset-to-tilemap');

// Ensure PNGs exist in input/output dirs for a session
TilesetImagePersister.persistImages(
    rootDir,         // absolute path to 'generated-tile-map-elements'
    outputDir,       // rootDir/output/sessionId
    sessionId,
    tilesets,        // mutates filePath, imageUrl, sessionId on each
    oldInputDir,     // '' if no rename
    newInputDir,     // '' if no rename
    oldSessionId     // '' if no rename
);

// Load image buffer (checks input/ then output/)
let imageBuffer = await TilesetImagePersister.loadImageBuffer(
    sessionId,
    imageId,         // filename
    rootDir
);

// Update cropped paths after session rename
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
let files = await builder.build(
    rootDir,         // absolute path to 'generated-tile-map-elements'
    sessionId,
    outputDir,       // rootDir/output/sessionId
    tilesets,        // tilesets with elements to generate files for
    fullTilesets,    // all tilesets (for composite — may include unselected)
    mapName,         // 'my-map'
    mapTitle         // 'My Map'
);
// files = [{ name, downloadUrl, type: 'output'|'input' }]
```

### 11. Tileset Merge

```javascript
let { TilesetsMerge } = require('@reldens/tileset-to-tilemap');

let merger = new TilesetsMerge();
let result = await merger.run(
    sessionId,
    tilesetsMergeData,   // array of tileset objects from session state
    outputDir,
    (message) => console.log(message)   // onProgress SSE callback
);
// result = { mergedTileset, stateIndices } or { error: string }
```

### 12. Tileset Resize

```javascript
let { TilesetResizer } = require('@reldens/tileset-to-tilemap');

let resizer = new TilesetResizer();
let result = await resizer.resize(
    inputPath,
    originalTileWidth,
    originalTileHeight,
    targetTileSize,   // e.g. 16 to downscale 32px tiles to 16px
    outputPath
);
// result = { tileWidth, tileHeight } or null on failure
```

## Output Files

All saved to `generated-tile-map-elements/output/{sessionId}/`:

- `session-editor-state.json` — full tileset+element state (used by Load session)
- `elements-config.json` — same state formatted for readability
- `{tileset-name}.png` — copy of original tileset PNG
- `{tileset-name}-{element-name}.json` — per-element Tiled-format map
- `{tileset-name}-annotated.png` — tileset with element overlays and grid
- `composite.json` — all elements on one Tiled map
- `map-generator-config.json` — Reldens map generator config

Input files stored in `generated-tile-map-elements/input/{sessionId}/`.

## Environment Variables (read by package)

### Claude
- `ANTHROPIC_API_KEY` — required to enable Claude
- `CLAUDE_MODEL` — default: `claude-sonnet-4-6`
- `CLAUDE_MAX_TOKENS` — naming token budget, default: 512
- `CLAUDE_MAX_TOKENS_DETECTION` — detection token budget, default: 4096

### Gemini
- `GEMINI_API_KEY` — required to enable Gemini
- `GEMINI_MODEL` — default: `gemini-2.0-flash-preview-image-generation`
- `GEMINI_MAX_TOKENS` — default: 512
- `GEMINI_MAX_TOKENS_DETECTION` — default: 4096

### Ollama
- `OLLAMA_HOST` — default: `http://localhost:11434`
- `OLLAMA_MODEL` — default: `qwen2.5vl:7b`
- `OLLAMA_AVAILABLE_MODELS` — comma-separated model list; each becomes a separate provider entry
- `OLLAMA_NUM_CTX` — context size, default: 8192
- `OLLAMA_NUM_PREDICT` — default: 2000
- Per-model overrides: replace `.`, `:`, `-` with `_` — e.g. `OLLAMA_NUM_CTX_qwen2_5vl_7b`

### Cluster Detection
- `MIN_CLUSTER_TILES` — discard clusters smaller than this, default: 1
- `CLUSTER_EMPTY_ALPHA_THRESHOLD` — alpha below this = transparent, default: 10
- `CLUSTER_COLOR_DISTANCE` — RGB distance from bgColor = background, default: 30
- `CLUSTER_VARIANCE_THRESHOLD` — exclude low-variance tiles, default: 600
- `CLUSTER_MIN_TILE_FILL_PCT` — min % of tile pixels that must be non-background, default: 10
- `CLUSTER_SPLIT_BY_GAP` — split clusters at internal empty tile rows/cols, default: 1
- `ELEMENT_BORDER_COLOR_DISTANCE` — max color distance between adjacent tile edges for single-element classification, default: 20

### Other
- `VALIDATE_PASS` — run verify step after naming, default: 0
- `SKIP_AI` — skip all AI analysis, default: 0
