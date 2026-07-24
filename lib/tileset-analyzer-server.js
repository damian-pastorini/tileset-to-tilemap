/**
 *
 * Reldens - TilesetAnalyzerServer
 *
 */

const { IndexRoute } = require('./routes/index');
const { SessionsRoute } = require('./routes/sessions');
const { UploadRoute } = require('./routes/upload');
const { GenerateRoute } = require('./routes/generate');
const { AiDetectRoute } = require('./routes/ai-detect');
const { AiNameRoute } = require('./routes/ai-name');
const { AiAssignLayersRoute } = require('./routes/ai-assign-layers');
const { SessionDeleteRoute } = require('./routes/session-delete');
const { SessionLoadRoute } = require('./routes/session-load');
const { SessionSaveRoute } = require('./routes/session-save');
const { DownloadZipRoute } = require('./routes/download-zip');
const { MergeRoute } = require('./routes/merge');
const { sc } = require('@reldens/utils');

class TilesetAnalyzerServer
{
    constructor(rootDir, options)
    {
        this.rootDir = rootDir;
        this.options = options || {};
        this.publicDir = sc.get(this.options, 'publicDir', 'public');
        this.showAiControls = sc.get(this.options, 'showAiControls', false);
        this.aiProviders = sc.get(this.options, 'aiProviders', []);
        this.skipAi = sc.get(this.options, 'skipAi', false);
        this.skipIndex = sc.get(this.options, 'skipIndex', false);
    }

    buildRouteHandler(authMiddleware, handler)
    {
        if(authMiddleware){
            return [authMiddleware, handler];
        }
        return [handler];
    }

    registerRoutes(app, authMiddleware)
    {
        let rootDir = this.rootDir;
        let options = this.options;
        let r = (handler) => this.buildRouteHandler(authMiddleware, handler);
        if(!this.skipIndex){
            let indexRoute = new IndexRoute(this.showAiControls, this.aiProviders, this.publicDir);
            app.get('/', ...r((req, res) => indexRoute.handle(req, res)));
        }
        let sessionsRoute = new SessionsRoute(rootDir);
        let uploadRoute = new UploadRoute(rootDir, options);
        let generateRoute = new GenerateRoute(rootDir, options);
        let aiDetectRoute = new AiDetectRoute(rootDir, options);
        let aiNameRoute = new AiNameRoute(rootDir, options);
        let aiAssignLayersRoute = new AiAssignLayersRoute(rootDir, options);
        let sessionDeleteRoute = new SessionDeleteRoute(rootDir);
        let sessionLoadRoute = new SessionLoadRoute(rootDir);
        let sessionSaveRoute = new SessionSaveRoute(rootDir);
        let downloadZipRoute = new DownloadZipRoute(rootDir);
        let mergeRoute = new MergeRoute(rootDir);
        app.get('/sessions', ...r((req, res) => sessionsRoute.handle(req, res)));
        app.delete('/sessions/:sessionId', ...r((req, res) => sessionDeleteRoute.handle(req, res)));
        app.get('/sessions/:sessionId/load', ...r((req, res) => sessionLoadRoute.handle(req, res)));
        app.post('/sessions/:sessionId/save', ...r((req, res) => sessionSaveRoute.handle(req, res)));
        app.post('/upload', ...r((req, res) => uploadRoute.handle(req, res)));
        app.post('/generate', ...r((req, res) => generateRoute.handle(req, res)));
        app.post('/merge', ...r((req, res) => mergeRoute.handle(req, res)));
        app.post('/ai-detect', ...r((req, res) => aiDetectRoute.handle(req, res)));
        app.post('/ai-name', ...r((req, res) => aiNameRoute.handle(req, res)));
        app.post('/ai-assign-layers', ...r((req, res) => aiAssignLayersRoute.handle(req, res)));
        app.get('/download-zip/:sessionId', ...r((req, res) => downloadZipRoute.handle(req, res)));
    }
}

module.exports.TilesetAnalyzerServer = TilesetAnalyzerServer;
