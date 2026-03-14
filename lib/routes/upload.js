/**
 *
 * Reldens - UploadRoute
 *
 */

let { AiAnalyzer } = require('../ai-analyzer');
let { TilesetResizer } = require('../tileset-resizer');
let { Helpers } = require('../utils/helpers');
let { RequestParser } = require('./request-parser');
let multer = require('multer');
let sharp = require('sharp');
let { FileHandler } = require('@reldens/server-utils');
let { Logger, sc } = require('@reldens/utils');

class UploadRoute extends RequestParser
{
    constructor(rootDir)
    {
        super();
        this.rootDir = rootDir;
        let storage = multer.diskStorage({
            destination: (req, file, cb) => {
                let dir = FileHandler.joinPaths(this.rootDir, 'input', req.sessionId);
                FileHandler.createFolder(dir);
                cb(null, dir);
            },
            filename: (req, file, cb) => cb(null, Date.now()+'-'+file.originalname)
        });
        this.upload = multer({ storage });
        this.tilesetResizer = new TilesetResizer();
    }

    sendEvent(res, eventType, data)
    {
        res.write('event: '+eventType+'\ndata: '+sc.toJsonString(data)+'\n\n');
        if(res.flush){
            res.flush();
        }
    }

    async resizeFile(file, sessionId, tileWidth, tileHeight, resizeValue)
    {
        let resizedFilename = 'resized-'+file.filename;
        let resizedPath = FileHandler.joinPaths(this.rootDir, 'input', sessionId, resizedFilename);
        let resized = await this.tilesetResizer.resize(file.path, tileWidth, tileHeight, resizeValue, resizedPath);
        if(!resized){
            return null;
        }
        return {
            filePath: resizedPath,
            imageId: resizedFilename,
            imageUrl: '/tileset-image/'+sessionId+'/'+resizedFilename,
            tileWidth: resized.tileWidth,
            tileHeight: resized.tileHeight
        };
    }

    buildProgressCallbacks(originalname, res)
    {
        let onToken = (count) => {
            this.sendEvent(res, 'progress', {file: originalname, tokens: count});
        };
        let onProgress = (info) => {
            this.sendEvent(res, 'progress', {
                file: originalname,
                status: 'analyzing',
                cluster: info.cluster,
                total: info.total
            });
        };
        return {onToken, onProgress};
    }

    async processFile(file, fileIndex, sessionId, tilesetParams, activeProviders, analyzer, debugDir, res)
    {
        Logger.info('UploadRoute: processing file '+file.originalname);
        let rawParams = sc.get(tilesetParams, fileIndex, {});
        let parsed = this.parseTilesetParams(rawParams);
        Logger.info('UploadRoute: params: '+sc.toJsonString(parsed));
        let tileWidth = parsed.tileWidth;
        let tileHeight = parsed.tileHeight;
        let filePath = file.path;
        let imageId = file.filename;
        let imageUrl = '/tileset-image/'+sessionId+'/'+file.filename;
        if(parsed.resizeValue && parsed.resizeValue !== tileWidth){
            let resizeResult = await this.resizeFile(file, sessionId, tileWidth, tileHeight, parsed.resizeValue);
            if(!resizeResult){
                Logger.error('UploadRoute: resize failed for '+file.originalname);
                this.sendEvent(res, 'error', {message: 'Resize failed for '+file.originalname});
                res.end();
                return null;
            }
            filePath = resizeResult.filePath;
            imageId = resizeResult.imageId;
            imageUrl = resizeResult.imageUrl;
            tileWidth = resizeResult.tileWidth;
            tileHeight = resizeResult.tileHeight;
        }
        let meta = await sharp(filePath).metadata();
        let imageWidth = meta.width;
        let imageHeight = meta.height;
        let tilesetColumns = Helpers.calcTileColumns(imageWidth, parsed.margin, parsed.spacing, tileWidth);
        let tileRows = Helpers.calcTileRows(imageHeight, parsed.margin, parsed.spacing, tileHeight);
        let { onToken, onProgress } = this.buildProgressCallbacks(file.originalname, res);
        let analyzed = await analyzer.analyzeImage(
            await sharp(filePath).png().toBuffer(),
            tilesetColumns, tileRows, tileWidth, tileHeight,
            parsed.margin, parsed.spacing, activeProviders, parsed.bgColor,
            onToken, onProgress, debugDir
        );
        return {
            imageId, filename: file.originalname, imageUrl, filePath,
            imageWidth, imageHeight, tileWidth, tileHeight,
            spacing: parsed.spacing, margin: parsed.margin,
            tilesetColumns, tileRows, tileCount: tilesetColumns * tileRows,
            bgColor: parsed.bgColor,
            originalTileWidth: parsed.tileWidth, originalTileHeight: parsed.tileHeight,
            resizeOption: parsed.resizeValue || 0,
            elements: analyzed.elements,
            filteredTiles: analyzed.filteredTiles || []
        };
    }

    handle(req, res, aiProviders, skipAi, showAiControls)
    {
        req.sessionId = sc.getDateForFileName();
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();
        if(res.socket){
            res.socket.setNoDelay(true);
        }
        this.upload.array('files')(req, res, async (err) => {
            if(err){
                Logger.error('UploadRoute: multer error: '+err.message);
                this.sendEvent(res, 'error', {message: 'Upload failed'});
                res.end();
                return;
            }
            await this.processUpload(req, res, aiProviders, skipAi, showAiControls);
        });
    }

    async processUpload(req, res, aiProviders, skipAi, showAiControls)
    {
        if(!req.files || !req.files.length){
            this.sendEvent(res, 'error', {message: 'No files uploaded'});
            res.end();
            return;
        }
        let tilesetParams = sc.parseJson(sc.get(req.body, 'tilesetParams', '[]'), []);
        let sessionId = req.sessionId;
        let outputDir = FileHandler.joinPaths(this.rootDir, 'output', sessionId);
        let logPath = FileHandler.joinPaths(outputDir, '_process.log');
        let debugDir = FileHandler.joinPaths(outputDir, 'cropped-clusters-from-analysis');
        FileHandler.createFolder(outputDir);
        let logLines = [];
        let prevCallback = Logger.callback;
        Logger.callback = (...args) => {
            if('function' === typeof prevCallback){ prevCallback(...args); }
            logLines.push(args.join(' '));
        };
        let tilesets = [];
        let analyzer = new AiAnalyzer();
        let activeProviders = skipAi ? [] : aiProviders;
        Logger.info('UploadRoute: processing '+req.files.length+' file(s) skipAi='+skipAi);
        Logger.info('UploadRoute: providers='+activeProviders.join(','));
        for(let fileIndex = 0; fileIndex < req.files.length; fileIndex++){
            let tileset = await this.processFile(
                req.files[fileIndex], fileIndex, sessionId,
                tilesetParams, activeProviders, analyzer, debugDir, res
            );
            if(!tileset){
                Logger.callback = prevCallback;
                return;
            }
            tilesets.push(tileset);
        }
        Logger.callback = prevCallback;
        FileHandler.writeFile(logPath, logLines.join('\n'));
        Logger.info('UploadRoute: process log saved - '+logPath);
        let firstName = tilesets[0].filename.replace(/\.[^.]+$/, '');
        let defaultMapName = sc.kebabCase(firstName).toLowerCase();
        let defaultMapTitle = defaultMapName.split('-').map(w => sc.capitalize(w)).join(' ');
        this.sendEvent(res, 'done', {
            sessionId, tilesets, defaultMapName, defaultMapTitle,
            showAiControls, activeProviders: aiProviders
        });
        res.end();
    }
}

module.exports.UploadRoute = UploadRoute;
