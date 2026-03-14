/**
 *
 * Reldens - MergeRoute
 *
 */

let { TilesetsMerge } = require('../tilesets-merge');
let { Helpers } = require('../utils/helpers');
let { FileHandler } = require('@reldens/server-utils');
let { Logger, sc } = require('@reldens/utils');

class MergeRoute
{
    constructor(rootDir)
    {
        this.rootDir = rootDir;
    }

    sendEvent(res, eventType, data)
    {
        res.write('event: '+eventType+'\ndata: '+sc.toJsonString(data)+'\n\n');
        if(res.flush){
            res.flush();
        }
    }

    async handle(req, res)
    {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();
        if(res.socket){
            res.socket.setNoDelay(true);
        }
        let sessionId = Helpers.sanitizeSessionId(sc.get(req.body, 'sessionId', ''));
        let tilesetsMergeData = sc.get(req.body, 'tilesets', []);
        if(!sessionId){
            this.sendEvent(res, 'error', {message: 'Session ID required'});
            res.end();
            return;
        }
        if(!sc.isArray(tilesetsMergeData) || 2 > tilesetsMergeData.length){
            this.sendEvent(res, 'error', {message: 'At least 2 tilesets required for merge'});
            res.end();
            return;
        }
        let outputDir = FileHandler.joinPaths(this.rootDir, 'output', sessionId);
        FileHandler.createFolder(outputDir);
        try {
            let merger = new TilesetsMerge();
            let result = await merger.run(
                sessionId,
                tilesetsMergeData,
                outputDir,
                message => this.sendEvent(res, 'progress', {message})
            );
            if(result.error){
                this.sendEvent(res, 'error', {message: result.error});
                res.end();
                return;
            }
            this.sendEvent(res, 'done', {mergedTileset: result.mergedTileset, stateIndices: result.stateIndices});
            res.end();
        } catch(error) {
            Logger.critical('MergeRoute: uncaught error: '+error.message);
            this.sendEvent(res, 'error', {message: 'Merge failed: '+error.message});
            res.end();
        }
    }
}

module.exports.MergeRoute = MergeRoute;
