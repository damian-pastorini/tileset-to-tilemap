/**
 *
 * Reldens - TilesetAnalyzerServer
 *
 */

let { IndexRoute } = require('./routes/index');
let { SessionsRoute } = require('./routes/sessions');
let { UploadRoute } = require('./routes/upload');
let { GenerateRoute } = require('./routes/generate');
let { DownloadRoute } = require('./routes/download');
let { AiDetectRoute } = require('./routes/ai-detect');
let { AiNameRoute } = require('./routes/ai-name');
let { AiAssignLayersRoute } = require('./routes/ai-assign-layers');
let { SessionDeleteRoute } = require('./routes/session-delete');
let { SessionLoadRoute } = require('./routes/session-load');
let { SessionSaveRoute } = require('./routes/session-save');
let { DownloadZipRoute } = require('./routes/download-zip');
let { MergeRoute } = require('./routes/merge');

class TilesetAnalyzerServer
{
    constructor(rootDir, publicDir, showAiControls, aiProviders, skipAi)
    {
        this.rootDir = rootDir;
        this.publicDir = publicDir || 'public';
        this.showAiControls = showAiControls || false;
        this.aiProviders = aiProviders || [];
        this.skipAi = skipAi || false;
    }

    registerRoutes(app)
    {
        let rootDir = this.rootDir;
        let aiProviders = this.aiProviders;
        let skipAi = this.skipAi;
        let showAiControls = this.showAiControls;
        let indexRoute = new IndexRoute(showAiControls, aiProviders, this.publicDir);
        let sessionsRoute = new SessionsRoute(rootDir);
        let uploadRoute = new UploadRoute(rootDir);
        let generateRoute = new GenerateRoute(rootDir);
        let downloadRoute = new DownloadRoute(rootDir);
        let aiDetectRoute = new AiDetectRoute(rootDir);
        let aiNameRoute = new AiNameRoute(rootDir);
        let aiAssignLayersRoute = new AiAssignLayersRoute(rootDir);
        let sessionDeleteRoute = new SessionDeleteRoute(rootDir);
        let sessionLoadRoute = new SessionLoadRoute(rootDir);
        let sessionSaveRoute = new SessionSaveRoute(rootDir);
        let downloadZipRoute = new DownloadZipRoute(rootDir);
        let mergeRoute = new MergeRoute(rootDir);
        app.get('/', (req, res) => indexRoute.handle(req, res));
        app.get('/sessions', (req, res) => sessionsRoute.handle(req, res));
        app.delete('/sessions/:sessionId', (req, res) => sessionDeleteRoute.handle(req, res));
        app.get('/sessions/:sessionId/load', (req, res) => sessionLoadRoute.handle(req, res));
        app.post('/sessions/:sessionId/save', (req, res) => sessionSaveRoute.handle(req, res));
        app.post('/upload', (req, res) => uploadRoute.handle(req, res, aiProviders, skipAi, showAiControls));
        app.post('/generate', (req, res) => generateRoute.handle(req, res));
        app.post('/merge', (req, res) => mergeRoute.handle(req, res));
        app.post('/ai-detect', (req, res) => aiDetectRoute.handle(req, res));
        app.post('/ai-name', (req, res) => aiNameRoute.handle(req, res));
        app.post('/ai-assign-layers', (req, res) => aiAssignLayersRoute.handle(req, res));
        app.get('/download/:sessionId/:filename', (req, res) => downloadRoute.handle(req, res));
        app.get('/download-zip/:sessionId', (req, res) => downloadZipRoute.handle(req, res));
    }
}

module.exports.TilesetAnalyzerServer = TilesetAnalyzerServer;
