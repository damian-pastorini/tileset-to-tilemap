/**
 *
 * Reldens - DownloadRoute
 *
 */

const { FileHandler } = require('@reldens/server-utils');

class DownloadRoute
{
    constructor(rootDir)
    {
        this.rootDir = rootDir;
    }

    handle(req, res)
    {
        let sessionId = req.params.sessionId;
        let filename = req.params.filename;
        let filePath = FileHandler.joinPaths(this.rootDir, 'output', sessionId, filename);
        if(!FileHandler.exists(filePath)){
            res.status(404).json({error: 'File not found'});
            return;
        }
        res.setHeader('Content-Disposition', 'attachment; filename="'+filename+'"');
        FileHandler.createReadStream(filePath).pipe(res);
    }
}

module.exports.DownloadRoute = DownloadRoute;
