/**
 *
 * Reldens - SessionLoadRoute
 *
 */

const { FileHandler } = require('@reldens/server-utils');
const { Logger, sc } = require('@reldens/utils');
const { TilesetImagePersister } = require('../tileset-image-persister');

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
            let state = JSON.parse(content);
            if(state.tilesets){
                let outputDir = FileHandler.joinPaths(this.rootDir, 'output', sessionId);
                TilesetImagePersister.persistImages(
                    this.rootDir, outputDir, sessionId, state.tilesets, '', '', '', this.rootDir
                );
                FileHandler.writeFile(configPath, JSON.stringify(state));
            }
            res.json(state);
        } catch(error) {
            Logger.error('SessionLoadRoute: parse error for session '+sessionId+': '+error.message);
            res.status(500).json({error: 'Invalid session config'});
        }
    }
}

module.exports.SessionLoadRoute = SessionLoadRoute;
