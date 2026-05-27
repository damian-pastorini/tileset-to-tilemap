/**
 *
 * Reldens - SessionsRoute
 *
 */

const { FileHandler } = require('@reldens/server-utils');

class SessionsRoute
{
    constructor(rootDir)
    {
        this.rootDir = rootDir;
    }

    buildInputFiles(sessionId)
    {
        let inputDir = FileHandler.joinPaths(this.rootDir, 'input', sessionId);
        if(!FileHandler.exists(inputDir)){
            return [];
        }
        let inputFileNames = FileHandler.getFilesInFolder(inputDir);
        let files = [];
        for(let name of inputFileNames){
            files.push({name, downloadUrl: 'tileset-image/'+sessionId+'/'+name, type: 'input'});
        }
        return files;
    }

    handle(req, res)
    {
        let outputDir = FileHandler.joinPaths(this.rootDir, 'output');
        if(!FileHandler.exists(outputDir)){
            res.json({sessions: []});
            return;
        }
        let subFolders = FileHandler.fetchSubFoldersList(outputDir);
        let sessions = [];
        let sorted = [...subFolders].sort().reverse();
        for(let sessionId of sorted){
            let sessionDir = FileHandler.joinPaths(outputDir, sessionId);
            let fileNames = FileHandler.getFilesInFolder(sessionDir);
            let sessionFiles = [];
            for(let name of fileNames){
                sessionFiles.push({name, downloadUrl: 'output/'+sessionId+'/'+name, type: 'output'});
            }
            sessionFiles.push(...this.buildInputFiles(sessionId));
            sessions.push({sessionId, files: sessionFiles});
        }
        res.json({sessions});
    }
}

module.exports.SessionsRoute = SessionsRoute;
