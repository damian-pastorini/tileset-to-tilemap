[![Reldens - GitHub - Release](https://www.dwdeveloper.com/media/reldens/reldens-mmorpg-platform.png)](https://github.com/damian-pastorini/reldens)

# Reldens - Tileset to Tile Map

A Node.js library that takes game tileset PNG images, detects individual game objects via pixel analysis, sends each cluster to AI providers for naming and layer assignment, and generates Tiled-compatible JSON files for use with the Reldens game platform.

Need some specific feature?

[Request a feature here: https://www.reldens.com/features-request](https://www.reldens.com/features-request)

---

## Features

- **Pixel-Level Cluster Detection**: Analyzes tileset PNGs tile by tile using connected component labeling to group related tiles into clusters
- **AI-Powered Naming**: Sends each detected cluster to Claude, Gemini, or Ollama for automatic naming and layer assignment
- **Multi-Provider Fallback**: Tries AI providers sequentially (Ollama → Claude → Gemini), using the first valid result
- **Layer Assignment**: AI assigns each element's tiles to the correct Tiled layer types (below-player, collisions, over-player, collisions-over-player)
- **Tiled JSON Output**: Generates per-element Tiled-compatible JSON maps and a composite map with all elements
- **Session Management**: Saves and loads analysis sessions, supports renaming and incremental saves
- **Tileset Merging**: Combines multiple source tilesets into a single merged tileset with remapped elements
- **Annotated Preview**: Generates annotated PNG with colored overlays per element for visual review
- **Express Integration**: `TilesetAnalyzerServer` mounts all API routes onto any Express app with optional auth middleware
- **Zero env-var coupling**: All configuration passed via constructor options with sensible defaults

## Documentation

[https://www.reldens.com/documentation/tileset-to-tilemap/](https://www.reldens.com/documentation/tileset-to-tilemap/)

## Installation

```bash
npm install @reldens/tileset-to-tilemap
```

## Quick Start

### Embed in an Express app

```javascript
const express = require('express');
const { Requirements, TilesetAnalyzerServer } = require('@reldens/tileset-to-tilemap');

async function start() {
    let requirements = new Requirements({
        ollamaHost: 'http://localhost:11434',
        anthropicApiKey: process.env.ANTHROPIC_API_KEY,
        geminiApiKey: process.env.GEMINI_API_KEY
    });
    let aiProviders = await requirements.resolveAiProviders();

    let app = express();
    let rootDir = '/path/to/generated-tile-map-elements';

    // Serve uploaded input images and generated output files
    app.use('/tileset-image', express.static(rootDir + '/input'));
    app.use('/output', express.static(rootDir + '/output'));

    let server = new TilesetAnalyzerServer(rootDir, {
        publicDir: '/path/to/public',
        aiProviders,
        showAiControls: true,
        claudeModel: 'claude-sonnet-4-6',
        ollamaHost: 'http://localhost:11434'
    });

    server.registerRoutes(app);
    app.listen(3000);
}

start();
```

### With auth middleware (e.g. admin integration)

```javascript
server.registerRoutes(app, isAuthenticatedMiddleware);
```

All routes automatically receive the middleware. Pass `skipIndex: true` in options to skip the `GET /` page route when embedding inside an existing app.

### Detect clusters and generate files programmatically

```javascript
const { AiAnalyzer, TilesetFilesBuilder, Helpers } = require('@reldens/tileset-to-tilemap');
const sharp = require('sharp');

let imageBuffer = await sharp('/path/to/tileset.png').png().toBuffer();
let meta = await sharp('/path/to/tileset.png').metadata();
let tileWidth = 32, tileHeight = 32, margin = 0, spacing = 0;

let analyzer = new AiAnalyzer({ ollamaHost: 'http://localhost:11434', skipAi: false });
let result = await analyzer.analyzeImage(
    imageBuffer,
    Helpers.calcTileColumns(meta.width, margin, spacing, tileWidth),
    Helpers.calcTileRows(meta.height, margin, spacing, tileHeight),
    tileWidth, tileHeight, margin, spacing,
    providers, '#ffffff', null, null, null
);
// result = { elements: [{ name, type, approved, layers }], filteredTiles: [[row, col], ...] }

let builder = new TilesetFilesBuilder();
let files = await builder.build(rootDir, sessionId, outputDir, tilesets, tilesets, 'my-map', 'My Map');
// files = [{ name, downloadUrl, type: 'output'|'input' }]
```

## Configuration Options

All options are passed to constructors. The package reads no `process.env` directly. Claude and Gemini API keys are picked up from `ANTHROPIC_API_KEY` / `GEMINI_API_KEY` env vars by their respective SDKs.

### `TilesetAnalyzerServer(rootDir, options)`

| Option | Default | Description |
|---|---|---|
| `publicDir` | `'public'` | Path to static files directory |
| `showAiControls` | `false` | Show manual AI buttons in the web UI |
| `aiProviders` | `[]` | Array of active provider strings |
| `skipAi` | `false` | Disable AI analysis entirely |
| `skipIndex` | `false` | Skip `GET /` page route (for admin embed) |

All AI and detection options below are also accepted and passed through to route handlers.

### AI Options (`AiAnalyzer`, `AiProviderCaller`, `MultiAiAnalyzer`)

| Option | Default | Description |
|---|---|---|
| `claudeModel` | `'claude-sonnet-4-6'` | Claude model ID |
| `claudeMaxTokens` | `512` | Token budget for naming/verify |
| `claudeMaxTokensDetection` | `4096` | Token budget for detection |
| `geminiModel` | `'gemini-2.0-flash-preview-image-generation'` | Gemini model ID |
| `geminiMaxTokens` | `512` | Token budget for naming/verify |
| `geminiMaxTokensDetection` | `4096` | Token budget for detection |
| `ollamaHost` | `'http://localhost:11434'` | Ollama server URL |
| `ollamaModel` | `'qwen2.5vl:7b'` | Default Ollama model |
| `ollamaAvailableModels` | `''` | Comma-separated list of additional Ollama models |
| `ollamaNumCtx` | `8192` | Ollama context size |
| `ollamaNumPredict` | `2000` | Ollama max tokens |
| `validatePass` | `false` | Run a verify step after naming |
| `skipAi` | `false` | Skip all AI calls |

### Detection Options (`ClusterDetector`, `ClusterCropper`)

| Option | Default | Description |
|---|---|---|
| `minClusterTiles` | `1` | Discard clusters smaller than this |
| `clusterEmptyAlphaThreshold` | `10` | Alpha below this = transparent |
| `clusterColorDistance` | `30` | RGB distance from bgColor = background |
| `clusterVarianceThreshold` | `600` | Exclude low-variance tiles |
| `clusterMinTileFillPct` | `10` | Min % of tile pixels that must be non-background |
| `clusterSplitByGap` | `1` | Split clusters at internal empty tile rows/cols |
| `elementBorderColorDistance` | `20` | Max color distance between adjacent tile edges for single-element classification |

## How It Works

1. **Upload**: Tileset PNG uploaded; Sharp reads pixel buffer
2. **Tile Scan**: Each tile scanned for non-background pixel fill percentage and variance
3. **Connected Components**: `image-js` runs connected component labeling on a binary pixel mask
4. **Cluster Classification**: Groups with uniform inter-tile border colors become elements; others stay as clusters
5. **AI Sub-Detection**: Each cluster sent to AI to split into named sub-elements
6. **AI Naming + Layers**: Each element cropped and sent to AI for a kebab-case name and layer assignments
7. **Multi-Provider Fallback**: Providers tried in order (Ollama → Claude → Gemini); first valid result wins
8. **Output Generation**: Per-element Tiled JSON, annotated PNG, composite map, and map-generator config written to `output/{sessionId}/`

## Output Files

All saved to `generated-tile-map-elements/output/{sessionId}/`:

- `session-editor-state.json` — full tileset+element state (used by Load session)
- `elements-config.json` — same state formatted for readability
- `{tileset-name}.png` — copy of original tileset PNG
- `{tileset-name}-{element-name}.json` — per-element Tiled-format map
- `{tileset-name}-annotated.png` — tileset with colored element overlays and grid
- `composite.json` — all elements combined on one Tiled map
- `map-generator-config.json` — Reldens map generator config

Input files stored in `generated-tile-map-elements/input/{sessionId}/`.

## Dependencies

- **sharp**: Pixel-level image processing and cropping
- **image-js**: Connected component labeling for cluster detection
- **archiver**: ZIP download of session output files
- **multer**: Multipart file upload handling
- **@anthropic-ai/sdk**: Claude AI provider
- **@google/genai**: Gemini AI provider
- **@reldens/utils**: Logger, Shortcuts (`sc`)
- **@reldens/server-utils**: FileHandler

## Related Packages

- **@reldens/tile-map-optimizer**: Optimize Tiled JSON maps by removing unused tiles and merging tilesets
- **@reldens/tile-map-generator**: Generate random tile maps for Reldens
- **Reldens**: MMORPG platform that uses these generated maps

---

### [Reldens](https://github.com/damian-pastorini/reldens/ "Reldens")

##### [By DwDeveloper](https://www.dwdeveloper.com/ "DwDeveloper")
