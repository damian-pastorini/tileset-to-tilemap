/**
 *
 * Reldens - SessionSaveRoute
 *
 */

let { TilesetImagePersister } = require('../tileset-image-persister');
let { Helpers } = require('../utils/helpers');
let { FileHandler } = require('@reldens/server-utils');
let { sc } = require('@reldens/utils');

class SessionSaveRoute
{
    constructor(rootDir)
    {
        this.rootDir = rootDir;
    }

    readExistingConfig(configPath, sessionId)
    {
        let existing = FileHandler.fetchFileJson(configPath);
        if(existing){
            return existing;
        }
        return {sessionId, tilesets: []};
    }

    mergeTileset(existing, tileset)
    {
        let found = false;
        let tilesets = [];
        for(let tilesetItem of existing.tilesets){
            if(tilesetItem.filename === tileset.filename){
                tilesets.push(tileset);
                found = true;
                continue;
            }
            tilesets.push(tilesetItem);
        }
        if(!found){
            tilesets.push(tileset);
        }
        existing.tilesets = tilesets;
    }

    saveConfig(configPath, data)
    {
        FileHandler.writeFile(configPath, sc.toJsonString(data));
    }

    handle(req, res)
    {
        let sessionId = Helpers.sanitizeSessionId(sc.get(req.body, 'sessionId', ''));
        if(!sessionId){
            res.status(400).json({error: 'Session ID required'});
            return;
        }
        let oldSessionId = Helpers.sanitizeSessionId(sc.get(req.body, 'oldSessionId', ''));
        let oldInputDir = '';
        let newInputDir = '';
        if(oldSessionId && oldSessionId !== sessionId){
            let oldOutputDir = FileHandler.joinPaths(this.rootDir, 'output', oldSessionId);
            let newOutputDir = FileHandler.joinPaths(this.rootDir, 'output', sessionId);
            if(FileHandler.exists(oldOutputDir)){
                FileHandler.moveFile(oldOutputDir, newOutputDir);
            }
            oldInputDir = FileHandler.joinPaths(this.rootDir, 'input', oldSessionId);
            newInputDir = FileHandler.joinPaths(this.rootDir, 'input', sessionId);
            if(FileHandler.exists(oldInputDir)){
                FileHandler.moveFile(oldInputDir, newInputDir);
            }
        }
        let tileset = sc.get(req.body, 'tileset', null);
        let tilesets = sc.get(req.body, 'tilesets', null);
        let outputDir = FileHandler.joinPaths(this.rootDir, 'output', sessionId);
        FileHandler.createFolder(outputDir);
        let configPath = FileHandler.joinPaths(outputDir, 'session-editor-state.json');
        if(tileset && !sc.isArray(tilesets)){
            let existing = this.readExistingConfig(configPath, sessionId);
            if(oldSessionId && oldSessionId !== sessionId && existing.croppedElementsPaths){
                existing.croppedElementsPaths = TilesetImagePersister.updateCroppedPaths(
                    existing.croppedElementsPaths,
                    oldSessionId,
                    sessionId
                );
                existing.sessionId = sessionId;
            }
            TilesetImagePersister.persistImages(this.rootDir, outputDir, sessionId, [tileset], oldInputDir, newInputDir, oldSessionId);
            this.mergeTileset(existing, tileset);
            this.saveConfig(configPath, existing);
            res.json({success: true});
            return;
        }
        if(!sc.isArray(tilesets) || !tilesets.length){
            res.status(400).json({error: 'Tilesets required'});
            return;
        }
        let existingConfig = FileHandler.fetchFileJson(configPath) || {};
        let croppedElementsPaths = sc.get(existingConfig, 'croppedElementsPaths', {});
        if(oldSessionId && oldSessionId !== sessionId){
            croppedElementsPaths = TilesetImagePersister.updateCroppedPaths(
                croppedElementsPaths,
                oldSessionId,
                sessionId
            );
        }
        TilesetImagePersister.persistImages(this.rootDir, outputDir, sessionId, tilesets, oldInputDir, newInputDir, oldSessionId);
        this.saveConfig(configPath, { sessionId, tilesets, croppedElementsPaths });
        res.json({success: true});
    }
}

module.exports.SessionSaveRoute = SessionSaveRoute;
