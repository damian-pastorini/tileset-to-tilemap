/**
 *
 * Reldens - DownloadZipRoute
 *
 */

const archiver = require('archiver');
const { FileHandler } = require('@reldens/server-utils');
const { Logger } = require('@reldens/utils');

class DownloadZipRoute
{
    constructor(rootDir)
    {
        this.rootDir = rootDir;
    }

    handle(req, res)
    {
        let sessionId = req.params.sessionId;
        let outputDir = FileHandler.joinPaths(this.rootDir, 'output', sessionId);
        if(!FileHandler.exists(outputDir)){
            res.status(404).json({error: 'Session not found'});
            return;
        }
        res.setHeader('Content-Disposition', 'attachment; filename="'+sessionId+'.zip"');
        res.setHeader('Content-Type', 'application/zip');
        let archive = archiver('zip', { zlib: { level: 6 } });
        archive.on('error', (err) => {
            Logger.error('DownloadZipRoute: '+err.message);
        });
        archive.pipe(res);
        archive.directory(outputDir, false);
        archive.finalize();
    }
}

module.exports.DownloadZipRoute = DownloadZipRoute;
