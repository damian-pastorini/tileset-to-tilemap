/**
 *
 * Reldens - UploadRoute
 *
 */

const { AiAnalyzer } = require('../ai-analyzer');
const { TilesetResizer } = require('../tileset-resizer');
const { Helpers } = require('../helpers');
const { RequestParser } = require('./request-parser');
const multer = require('multer');
const sharp = require('sharp');
const { FileHandler } = require('@reldens/server-utils');
const { Logger, sc } = require('@reldens/utils');

class UploadRoute extends RequestParser
{
    constructor(rootDir, options)
    {
        super();
        this.rootDir = rootDir;
        this.options = options || {};
        let storage = multer.diskStorage({
            destination: (req, file, callback) => {
                let dir = FileHandler.joinPaths(this.rootDir, 'input', req.sessionId);
                FileHandler.createFolder(dir);
                callback(null, dir);
            },
            filename: (req, file, callback) => callback(null, Date.now()+'-'+file.originalname)
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
            imageUrl: 'tileset-image/'+sessionId+'/'+resizedFilename,
            tileWidth: resized.tileWidth,
            tileHeight: resized.tileHeight
        };
    }

    buildProgressCallbacks(originalName, res)
    {
        return {
            onToken: (count) => {
                this.sendEvent(res, 'progress', {file: originalName, tokens: count});
            },
            onProgress: (info) => {
                this.sendEvent(res, 'progress', {
                    file: originalName,
                    status: 'analyzing',
                    cluster: info.cluster,
                    total: info.total
                });
            }
        };
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
        let imageUrl = 'tileset-image/'+sessionId+'/'+file.filename;
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
        let { elements, filteredTiles } = await analyzer.analyzeImage({
            imageBuffer: await sharp(filePath).png().toBuffer(),
            tilesetColumns,
            tileRows,
            tileWidth,
            tileHeight,
            margin: parsed.margin,
            spacing: parsed.spacing,
            providers: activeProviders,
            bgColorHex: parsed.bgColor,
            onToken,
            onProgress,
            debugDir
        });
        return {
            imageId, filename: file.originalname, imageUrl, filePath,
            imageWidth, imageHeight, tileWidth, tileHeight,
            spacing: parsed.spacing, margin: parsed.margin,
            tilesetColumns, tileRows, tileCount: tilesetColumns * tileRows,
            bgColor: parsed.bgColor,
            originalTileWidth: parsed.tileWidth, originalTileHeight: parsed.tileHeight,
            resizeOption: parsed.resizeValue || 0,
            elements,
            filteredTiles: filteredTiles || []
        };
    }

    handle(req, res)
    {
        req.sessionId = sc.getDateForFileName();
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();
        if(res.socket){
            res.socket.setNoDelay(true);
        }
        this.upload.array('files')(req, res, async (error) => {
            if(error){
                Logger.error('UploadRoute: multer error: '+error.message);
                this.sendEvent(res, 'error', {message: 'Upload failed'});
                res.end();
                return;
            }
            await this.processUpload(req, res);
        });
    }

    async processUpload(req, res)
    {
        if(!req.files || !req.files.length){
            this.sendEvent(res, 'error', {message: 'No files uploaded'});
            res.end();
            return;
        }
        let aiProviders = sc.get(this.options, 'aiProviders', []);
        let skipAi = sc.get(this.options, 'skipAi', false);
        let showAiControls = sc.get(this.options, 'showAiControls', false);
        let tilesetParams = sc.parseJson(sc.get(req.body, 'tilesetParams', '[]'), []);
        let sessionId = req.sessionId;
        let outputDir = FileHandler.joinPaths(this.rootDir, 'output', sessionId);
        let logPath = FileHandler.joinPaths(outputDir, '_process.log');
        let debugDir = FileHandler.joinPaths(outputDir, 'cropped-clusters-from-analysis');
        FileHandler.createFolder(outputDir);
        let logLines = [];
        let prevCallback = Logger.callback;
        Logger.callback = (...args) => {
            if('function' === typeof prevCallback){
                prevCallback(...args);
            }
            logLines.push(args.join(' '));
        };
        try {
            let tilesets = [];
            let analyzer = new AiAnalyzer(this.options);
            let activeProviders = skipAi ? [] : aiProviders;
            Logger.info('UploadRoute: processing '+req.files.length+' file(s) skipAi='+skipAi);
            Logger.info('UploadRoute: providers='+activeProviders.join(','));
            for(let fileIndex = 0; fileIndex < req.files.length; fileIndex++){
                let tileset = await this.processFile(
                    req.files[fileIndex], fileIndex, sessionId,
                    tilesetParams, activeProviders, analyzer, debugDir, res
                );
                if(!tileset){
                    return;
                }
                tilesets.push(tileset);
            }
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
        } catch(error) {
            Logger.error('UploadRoute: processing failed: '+error.message, error.stack);
            this.sendEvent(res, 'error', {message: 'Upload failed: '+error.message});
            res.end();
        } finally {
            Logger.callback = prevCallback;
        }
    }
}

module.exports.UploadRoute = UploadRoute;
