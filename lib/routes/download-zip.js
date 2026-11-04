/**
 *
 * Reldens - DownloadZipRoute
 *
 */

const { Readable } = require('node:stream');
const { pipeline } = require('node:stream/promises');
const { Zip, ZipDeflate } = require('fflate');
const { FileHandler } = require('@reldens/server-utils');
const { Logger, sc } = require('@reldens/utils');
const { Helpers } = require('../helpers');
const { TilesetConst } = require('../constants');

class DownloadZipRoute
{
    constructor(rootDir)
    {
        this.rootDir = rootDir;
    }

    async handle(req, res)
    {
        let sessionId = Helpers.sanitizeSessionId(sc.get(req.params, 'sessionId', ''));
        if(!sessionId){
            res.status(400).json({error: 'Invalid session ID'});
            return;
        }
        let outputDir = FileHandler.joinPaths(this.rootDir, 'output', sessionId);
        if(!FileHandler.isFolder(outputDir)){
            res.status(404).json({error: 'Session not found'});
            return;
        }
        res.setHeader('Content-Disposition', 'attachment; filename="'+sessionId+'.zip"');
        res.setHeader('Content-Type', 'application/zip');
        let zipStream = Readable.from(this.buildZipChunks(this.collectFiles(outputDir, '', [])), {objectMode: false});
        await pipeline(zipStream, res).catch((error) => {
            Logger.error('DownloadZipRoute: session '+sessionId+' - '+error.message);
        });
    }

    collectFiles(folderPath, relativePrefix, files)
    {
        for(let entryName of FileHandler.readFolder(folderPath)){
            let entryPath = FileHandler.joinPaths(folderPath, entryName);
            if(FileHandler.isFolder(entryPath)){
                this.collectFiles(entryPath, relativePrefix+entryName+'/', files);
                continue;
            }
            if(FileHandler.isFile(entryPath)){
                files.push({path: entryPath, name: relativePrefix+entryName});
            }
        }
        return files;
    }

    async *buildZipChunks(files)
    {
        let pendingChunks = [];
        let zipState = {error: false};
        let zip = new Zip((error, chunk) => {
            if(error){
                zipState.error = error;
                return;
            }
            pendingChunks.push(chunk);
        });
        for(let file of files){
            let fileStream = FileHandler.createReadStream(file.path);
            if(!fileStream){
                Logger.warning('DownloadZipRoute: skipped missing file '+file.name);
                continue;
            }
            let zipEntry = new ZipDeflate(file.name, {level: TilesetConst.ZIP_COMPRESSION_LEVEL});
            zip.add(zipEntry);
            for await(let fileChunk of fileStream){
                zipEntry.push(fileChunk);
                yield this.takePendingChunks(pendingChunks, zipState);
            }
            zipEntry.push(new Uint8Array(0), true);
            yield this.takePendingChunks(pendingChunks, zipState);
        }
        zip.end();
        yield this.takePendingChunks(pendingChunks, zipState);
    }

    takePendingChunks(pendingChunks, zipState)
    {
        if(zipState.error){
            throw zipState.error;
        }
        return Buffer.concat(pendingChunks.splice(0));
    }
}

module.exports.DownloadZipRoute = DownloadZipRoute;
