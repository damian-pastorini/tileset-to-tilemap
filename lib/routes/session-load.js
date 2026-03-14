/**
 *
 * Reldens - SessionLoadRoute
 *
 */

let { FileHandler } = require('@reldens/server-utils');
let { Logger, sc } = require('@reldens/utils');

class SessionLoadRoute
{
    constructor(rootDir)
    {
        this.rootDir = rootDir;
    }

    handle(req, res)
    {
        let sessionId = sc.get(req.params, 'sessionId', '');
        if(!sessionId){
            res.status(400).json({error: 'Session ID required'});
            return;
        }
        let configPath = FileHandler.joinPaths(this.rootDir, 'output', sessionId, 'session-editor-state.json');
        if(!FileHandler.exists(configPath)){
            res.status(404).json({error: 'Session config not found'});
            return;
        }
        let content = FileHandler.readFile(configPath);
        if(!content){
            Logger.error('SessionLoadRoute: empty config for session: '+sessionId);
            res.status(500).json({error: 'Failed to read session config'});
            return;
        }
        try {
            res.json(JSON.parse(content));
        } catch(error) {
            Logger.error('SessionLoadRoute: parse error for session '+sessionId+': '+error.message);
            res.status(500).json({error: 'Invalid session config'});
        }
    }
}

module.exports.SessionLoadRoute = SessionLoadRoute;
