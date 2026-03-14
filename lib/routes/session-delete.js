/**
 *
 * Reldens - SessionDeleteRoute
 *
 */

let { FileHandler } = require('@reldens/server-utils');

class SessionDeleteRoute
{
    constructor(rootDir)
    {
        this.rootDir = rootDir;
    }

    handle(req, res)
    {
        let sessionId = req.params.sessionId;
        if(!sessionId || sessionId.includes('/') || sessionId.includes('\\') || sessionId.includes('..')){
            res.status(400).json({success: false});
            return;
        }
        FileHandler.remove(FileHandler.joinPaths(this.rootDir, 'output', sessionId));
        FileHandler.remove(FileHandler.joinPaths(this.rootDir, 'input', sessionId));
        res.json({success: true});
    }
}

module.exports.SessionDeleteRoute = SessionDeleteRoute;
